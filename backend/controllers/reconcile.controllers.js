import dotenv from "dotenv";
dotenv.config();
import xlsx from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Reconciliation from "../models/reconciliation.model.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const systemInstruction = `You are an expert reconciliation assistant.
Match transactions from File A and File B based on these rules:
1. Match based on customer names, invoice/transaction numbers, amounts, and descriptions.
2. Allow date mismatches up to ±3 days. DO NOT match entries if the date difference is more than 3 days.
3. Handle fuzzy matches in text fields (e.g., Invoice vs INV vs /INV/).
4. Consider currency formatting differences but ensure amounts match logically.
5. Avoid duplicate matches.
6. Return only one list per entry: matched or unmatched.
7. Dates must be returned in human-readable format (DD/MM/YYYY).
8. Keep JSON clean and parsable. Do not include markdown or explanations.`;

function parseFile(buffer, fileName) {
  const isCSV = fileName.endsWith(".csv");
  const workbook = xlsx.read(buffer, {
    type: "buffer",
    ...(isCSV && { raw: true }),
  });
  return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

function convertExcelDateToIndianFormat(serial) {
  if (typeof serial !== "number") return serial;
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeDatesInObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(normalizeDatesInObject);
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (key.toLowerCase().includes("date")) {
        newObj[key] = convertExcelDateToIndianFormat(obj[key]);
      } else {
        newObj[key] = normalizeDatesInObject(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

function chunkArray(arr, chunkSize) {
  const result = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
}

function sortByDate(data) {
  return data.sort((a, b) => new Date(a.Date) - new Date(b.Date));
}

function extractValidJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonSub = text.slice(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(jsonSub);
      } catch (err) {
        console.error("Cleaned JSON parse failed:", err);
        return null;
      }
    }
    return null;
  }
}

async function reconcileBatch(batchA, batchB) {
  const prompt = `File A: ${JSON.stringify(batchA, null, 2)}

File B: ${JSON.stringify(batchB, null, 2)}

Return ONLY a JSON object without markdown, like:
{
  "matches": [
    {
      "file_a_entry": { ... },
      "file_b_entry": { ... },
      "confidence_score": 0.87,
      "match_reason": "Amount and description match, dates within 3 days"
    }
  ],
  "unmatched_file_a_entries": [ ... ],
  "unmatched_file_b_entries": [ ... ]
}

Rules:
- Do not match entries with date differences over 3 days.
- Return dates in Indian format: DD/MM/YYYY.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction,
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();

  const cleanedResult = extractValidJson(text);
  if (!cleanedResult) console.error("Failed to extract valid JSON block.");
  return cleanedResult;
}

export const uploadAndReconcile = async (req, res) => {
  try {
    const user = req.user;
    const fileA = req.files.fileA[0];
    const fileB = req.files.fileB[0];

    let sheetA = parseFile(fileA.buffer, fileA.originalname);
    let sheetB = parseFile(fileB.buffer, fileB.originalname);

    sheetA = sortByDate(sheetA);
    sheetB = sortByDate(sheetB);

    const bigger = sheetA.length >= sheetB.length ? sheetA : sheetB;
    const smaller = sheetA.length < sheetB.length ? sheetA : sheetB;
    const bigChunks = chunkArray(bigger, 20);

    const finalMatches = [];
    const allMatchedA = new Set();
    const allMatchedB = new Set();
    const unmatchedASet = new Set();
    const unmatchedBSet = new Set();

    const MAX_CONCURRENT = 3;

    const runInBatches = async () => {
      const queue = [...bigChunks];
      const results = [];

      const worker = async () => {
        while (queue.length) {
          const chunk = queue.shift();
          const result = await reconcileBatch(
            bigger === sheetA ? chunk : smaller,
            bigger === sheetB ? chunk : smaller
          );
          if (result) results.push(result);
        }
      };

      await Promise.all(Array.from({ length: MAX_CONCURRENT }, () => worker()));
      return results;
    };

    const batchResults = await runInBatches();

    for (const result of batchResults) {
      for (const match of result.matches || []) {
        const normalizedMatch = normalizeDatesInObject(match);
        finalMatches.push(normalizedMatch);
        allMatchedA.add(JSON.stringify(normalizedMatch.file_a_entry));
        allMatchedB.add(JSON.stringify(normalizedMatch.file_b_entry));
      }

      for (const unmatchedAEntry of result.unmatched_file_a_entries || []) {
        const entry = normalizeDatesInObject(unmatchedAEntry);
        const str = JSON.stringify(entry);
        if (!allMatchedA.has(str)) unmatchedASet.add(str);
      }

      for (const unmatchedBEntry of result.unmatched_file_b_entries || []) {
        const entry = normalizeDatesInObject(unmatchedBEntry);
        const str = JSON.stringify(entry);
        if (!allMatchedB.has(str)) unmatchedBSet.add(str);
      }
    }

    const unmatchedA = Array.from(unmatchedASet).map((str) => JSON.parse(str));
    const unmatchedB = Array.from(unmatchedBSet).map((str) => JSON.parse(str));

    const finalResult = {
      matches: finalMatches,
      unmatched_file_a_entries: unmatchedA,
      unmatched_file_b_entries: unmatchedB,
    };

    await Reconciliation.create({
      userId: user._id,
      fileA: sheetA,
      fileB: sheetB,
      result: finalResult,
    });

    res.json(finalResult);
  } catch (err) {
    console.error("Error in reconciliation:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

export const getReconciliations = async (req, res) => {
  try {
    const user = req.user;
    const reconciliations = await Reconciliation.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .select("_id createdAt result");
    res.json(reconciliations);
  } catch (err) {
    console.error("Error fetching reconciliations:", err);
    res.status(500).json({ error: "Failed to fetch reconciliations" });
  }
};
