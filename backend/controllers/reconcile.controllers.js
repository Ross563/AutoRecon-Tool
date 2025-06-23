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

// import dotenv from "dotenv";
// dotenv.config();
// import xlsx from "xlsx";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import Reconciliation from "../models/reconciliation.model.js";

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// function parseFile(buffer, fileName) {
//   const isCSV = fileName.endsWith(".csv");
//   const workbook = xlsx.read(buffer, {
//     type: "buffer",
//     ...(isCSV && { raw: true }),
//   });
//   return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
// }

// function chunkArray(arr, chunkSize) {
//   const result = [];
//   for (let i = 0; i < arr.length; i += chunkSize) {
//     result.push(arr.slice(i, i + chunkSize));
//   }
//   return result;
// }

// async function reconcileBatch(batchA, batchB) {
//   try {
//     const prompt = `You are a reconciliation assistant. Match transactions between two datasets.
// Consider fuzzy description matching, currency/format variations, date shifts (±3 days), and partial/duplicate payments.
// Return ONLY a JSON object without any markdown or formatting characters like \`\`\`.
// Format:
// {
//   "matches": [...],
//   "unmatched_file_a_entries": [...],
//   "unmatched_file_b_entries": [...]
// }

// File A: ${JSON.stringify(batchA, null, 2)}

// File B: ${JSON.stringify(batchB, null, 2)}`;

//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const text = await response.text();

//     try {
//       return JSON.parse(text);
//     } catch (e) {
//       console.warn("Direct JSON.parse failed, cleaning and retrying...");
//       const cleaned = text
//         .replace(/^```json\s*/i, "")
//         .replace(/```$/, "")
//         .trim();
//       try {
//         return JSON.parse(cleaned);
//       } catch (err) {
//         console.error("Failed to parse cleaned Gemini response:", err);
//         return null;
//       }
//     }
//   } catch (err) {
//     console.error("Error in reconcileBatch:", err);
//     return null;
//   }
// }

// export const uploadAndReconcile = async (req, res) => {
//   try {
//     const user = req.user;
//     console.log("user in reconcile controller:", user);

//     const fileA = req.files.fileA[0];
//     const fileB = req.files.fileB[0];
//     console.log("fileA:", fileA);
//     console.log("fileB:", fileB);

//     const sheetA = parseFile(fileA.buffer, fileA.originalname);
//     const sheetB = parseFile(fileB.buffer, fileB.originalname);

//     console.log("Parsed sheetA[0]:", sheetA[0]);
//     console.log("Parsed sheetB[0]:", sheetB[0]);

//     const chunkSize = 10;
//     const chunksA = chunkArray(sheetA, chunkSize);
//     const chunksB = chunkArray(sheetB, chunkSize);

//     console.log("chunksA length:", chunksA.length);
//     console.log("chunksB length:", chunksB.length);

//     const finalMatches = [];
//     const unmatchedA = [];
//     const unmatchedB = [];

//     for (const aChunk of chunksA) {
//       for (const bChunk of chunksB) {
//         console.log(
//           "Reconciling batch: aChunk[0]:",
//           aChunk[0],
//           "bChunk[0]:",
//           bChunk[0]
//         );
//         const result = await reconcileBatch(aChunk, bChunk);
//         console.log("Batch result:", result);
//         if (!result) continue;

//         finalMatches.push(...(result.matches || []));
//         unmatchedA.push(...(result.unmatched_file_a_entries || []));
//         unmatchedB.push(...(result.unmatched_file_b_entries || []));
//       }
//     }

//     const finalResult = {
//       matches: finalMatches,
//       unmatched_file_a_entries: unmatchedA,
//       unmatched_file_b_entries: unmatchedB,
//     };

//     console.log("Final reconciliation result:", finalResult);

//     await Reconciliation.create({
//       userId: user._id,
//       fileA: sheetA,
//       fileB: sheetB,
//       result: finalResult,
//     });

//     res.json(finalResult);
//   } catch (err) {
//     console.error("Error in reconciliation:", err);
//     res
//       .status(500)
//       .json({ error: "Internal server error", details: err.message });
//   }
// };

// // import dotenv from "dotenv";
// // dotenv.config();
// // import xlsx from "xlsx";
// // import { GoogleGenerativeAI } from "@google/generative-ai";
// // import Reconciliation from "../models/reconciliation.model.js";

// // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
// // console.log("Google Generative AI key:", process.env.GOOGLE_AI_KEY);
// // function parseFile(buffer, fileName) {
// //   const isCSV = fileName.endsWith(".csv");
// //   const workbook = xlsx.read(buffer, {
// //     type: "buffer",
// //     ...(isCSV && { raw: true }),
// //   });
// //   return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
// // }

// // export const uploadAndReconcile = async (req, res) => {
// //   try {
// //     const user = req.user;
// //     const fileA = req.files.fileA[0];
// //     const fileB = req.files.fileB[0];

// //     const sheetA = parseFile(fileA.buffer, fileA.originalname);
// //     const sheetB = parseFile(fileB.buffer, fileB.originalname);

// //     console.log("Parsed sheetA[0]:", sheetA[0]);
// //     console.log("Parsed sheetB[0]:", sheetB[0]);

// //     const prompt = `You are a reconciliation assistant. Match transactions between two datasets.
// // Consider fuzzy description matching, currency/format variations, date shifts (±3 days), and partial/duplicate payments.
// // Return JSON as:

// // {
// //   "matches": [
// //     {
// //       "file_a_entry": { ... },
// //       "file_b_entry": { ... },
// //       "confidence_score": 0.94,
// //       "match_reason": "Amount matched, description similar"
// //     }
// //   ],
// //   "unmatched_file_a_entries": [ ... ],
// //   "unmatched_file_b_entries": [ ... ]
// // }

// // File A: ${JSON.stringify(sheetA.slice(0, 10), null, 2)}

// // File B: ${JSON.stringify(sheetB.slice(0, 10), null, 2)}`;

// //     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     const text = await response.text();
// //     console.log("AI response text:", text);

// //     let parsed;
// //     try {
// //       parsed = JSON.parse(text);
// //       console.log("Parsed AI response as JSON:", parsed);
// //     } catch (e) {
// //       console.error("Failed to parse Gemini response as JSON:", e);
// //       console.warn(
// //         "Direct JSON.parse failed, attempting to extract JSON block..."
// //       );

// //       // Try to strip triple backticks manually
// //       const cleanedText = text
// //         .replace(/^\s*```json\s*/i, "") // remove starting ```json
// //         .replace(/^\s*```\s*/i, "") // or starting ```
// //         .replace(/\s*```$/, ""); // remove ending ```

// //       try {
// //         parsed = JSON.parse(cleanedText);
// //       } catch (innerErr) {
// //         console.error("Failed to parse cleaned Gemini response:", innerErr);
// //         return res.status(400).json({
// //           error: "Gemini response not in valid JSON format.",
// //           original: text,
// //           cleaned: cleanedText,
// //         });
// //       }
// //     }
// //     console.log("Parsed AI response:", parsed);

// //     console.log("AI response parsed successfully.");

// //     await Reconciliation.create({
// //       userId: user._id,
// //       fileA: sheetA,
// //       fileB: sheetB,
// //       result: parsed,
// //     });

// //     res.json(parsed);
// //   } catch (err) {
// //     console.error("Error in reconciliation:", err);
// //     res
// //       .status(500)
// //       .json({ error: "Internal server error", details: err.message });
// //   }
// // };
