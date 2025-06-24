import dotenv from "dotenv";
dotenv.config();
import xlsx from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Reconciliation from "../models/reconciliation.model.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

function parseFile(buffer, fileName) {
  const isCSV = fileName.endsWith(".csv");
  const workbook = xlsx.read(buffer, {
    type: "buffer",
    ...(isCSV && { raw: true }),
  });
  return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

function chunkArray(arr, chunkSize) {
  const result = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
}

async function reconcileBatch(batchA, batchB) {
  const prompt = `You are a reconciliation assistant. Match transactions between two datasets.
Consider fuzzy description matching, currency/format variations, date shifts (±3 days), and partial/duplicate payments.
Return ONLY a JSON object without any markdown or formatting characters like \`\`\`.
Format:
{
  "matches": [
    {
      "file_a_entry": { ... },
      "file_b_entry": { ... },
      "confidence_score": 0.87,
      "match_reason": "Description and amount match, dates within range"
    }
  ],
  "unmatched_file_a_entries": [...],
  "unmatched_file_b_entries": [...]
}

File A: ${JSON.stringify(batchA, null, 2)}

File B: ${JSON.stringify(batchB, null, 2)}`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("Direct JSON.parse failed, cleaning and retrying...");
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse cleaned Gemini response:", err);
      return null;
    }
  }
}

export const uploadAndReconcile = async (req, res) => {
  try {
    const user = req.user;
    const fileA = req.files.fileA[0];
    const fileB = req.files.fileB[0];

    const sheetA = parseFile(fileA.buffer, fileA.originalname);
    const sheetB = parseFile(fileB.buffer, fileB.originalname);

    const chunkSize = 10;
    const chunksA = chunkArray(sheetA, chunkSize);
    const chunksB = chunkArray(sheetB, chunkSize);

    const finalMatches = [];
    const unmatchedA = [];
    const unmatchedB = [];

    for (const aChunk of chunksA) {
      for (const bChunk of chunksB) {
        const result = await reconcileBatch(aChunk, bChunk);
        if (!result) continue;

        finalMatches.push(...(result.matches || []));
        unmatchedA.push(...(result.unmatched_file_a_entries || []));
        unmatchedB.push(...(result.unmatched_file_b_entries || []));
      }
    }

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
