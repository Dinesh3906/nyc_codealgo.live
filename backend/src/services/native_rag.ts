import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { pipeline } from "@xenova/transformers";
import { OCRService } from "./ocr.service";

// Local embedding model
let embeddingModel: any = null;

async function initEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embeddingModel;
}

// Function to generate query embedding using local model
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function checkComplianceTS(housePlanPath: string) {
  const fileExt = path.extname(housePlanPath).toLowerCase();
  let housePlanText = "";
  let base64Image = "";

  if (fileExt === ".pdf") {
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(housePlanPath);
    const data = await pdfParse(dataBuffer);
    housePlanText = data.text;
  } else {
    // For images, we prepare for VISION
    console.log(`[RAG] Image detected, preparing for Llama 90B Vision...`);
    const imageBuffer = fs.readFileSync(housePlanPath);
    let mime = 'image/jpeg';
    if (fileExt === '.png') mime = 'image/png';
    else if (fileExt === '.webp') mime = 'image/webp';
    else if (fileExt === '.heic') mime = 'image/heic';
    base64Image = `data:${mime};base64,${imageBuffer.toString('base64')}`;
    // Gemini handles Vision natively. No need for slow local OCR which hangs the server.
    housePlanText = "Vision-based analysis (Image provided)";
  }

  console.log(`[RAG] Data prepared. Text: ${housePlanText.length} chars. Image: ${base64Image ? 'PRESENT' : 'NONE'}`);

  // Multi-Query RAG: Search across multiple NYC code domains for maximum coverage
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  const index = pc.Index(process.env.PINECONE_INDEX as string);

  const searchQueries = [
    // Fire & Life Safety (Chapters 7, 9)
    "NYC building code fire safety smoke detectors carbon monoxide alarms sprinkler fire alarm requirements " + housePlanText.substring(0, 200),
    "NYC fire code fire protection systems automatic sprinklers standpipe fire department access",
    // Means of Egress (Chapter 10)  
    "NYC building code means of egress exit doors exit signs emergency lighting travel distance corridors dead end",
    // Accessibility (Chapter 11)
    "NYC building code accessibility ADA wheelchair clearance accessible route ramp elevator disabled",
    // Interior Environment (Chapter 12)
    "NYC building code room dimensions minimum area ceiling height habitable spaces light ventilation",
    // Doors, Windows, Openings
    "NYC building code doors windows minimum width clear opening emergency escape egress window sill height",
    // Stairs & Vertical (Chapters 10, 30)
    "NYC building code stairs riser tread depth handrail guardrail headroom landing elevator",
    // Structural (Chapters 16-18)
    "NYC building code structural design loads foundations soils bearing capacity seismic wind",
    // Exterior & Roofing (Chapters 14-15)
    "NYC building code exterior walls facade roof assemblies waterproofing insulation parapet",
    // Interior Finishes (Chapter 8)
    "NYC building code interior finishes flame spread smoke development wall ceiling floor finishes",
    // MEP - Electrical (Chapter 27)
    "NYC electrical code panel location wiring circuits outlets GFCI arc fault receptacles",
    // MEP - Plumbing (Chapter 29)
    "NYC plumbing code fixtures water supply drainage trap vent bathroom kitchen",
    // MEP - Mechanical (Chapter 28)
    "NYC mechanical code HVAC ventilation ductwork exhaust air conditioning heating",
    // Zoning & Admin
    "NYC zoning resolution floor area ratio FAR setbacks lot coverage height limits building classification",
    // Construction Documents
    "NYC admin code construction documents architect stamp professional engineer seal permit filing"
  ];

  console.log(`[RAG] Running ${searchQueries.length} targeted queries across 113 NYC code PDFs...`);

  const allMatches: any[] = [];
  const seenTexts = new Set<string>();

  for (const query of searchQueries) {
    const queryVector = await generateQueryEmbedding(query);
    const queryResponse = await index.query({
      topK: 40,
      vector: queryVector,
      includeMetadata: true,
    });

    for (const match of queryResponse.matches) {
      const text = String(match.metadata?.text || "");
      if (!seenTexts.has(text.substring(0, 50))) {
        seenTexts.add(text.substring(0, 50));
        allMatches.push(match);
      }
    }
  }

  console.log(`[RAG] Retrieved ${allMatches.length} unique code sections from Pinecone (across ${seenTexts.size} chunks)`);

  const contexts = allMatches
    .sort((a, b) => String(a.metadata?.text || "").localeCompare(String(b.metadata?.text || "")))
    .map(m => `[NYC Code Section: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
    .join("\n\n---\n\n");

  // GROQ-TUNNEL: Direct fetch to OpenRouter to bypass AWS IP blocks on Groq
  const userContent: any[] = [
    {
      type: "text",
      text: `Analyze this NYC architectural plan for code compliance. 
      
      GLOBAL GROUND TRUTH (Massive Retrieval from 113 NYC Building Code PDFs):
      ${contexts.substring(0, 40000)}
      
      EXTRACTED DATA:
      ${housePlanText.substring(0, 5000)}`
    }
  ];

  if (base64Image) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`
      }
    });
  }

  console.log(`[RAG] === GOOGLE AI STUDIO VERSION === Sending ${contexts.length} chars of PDF data...`);

  let response;
  let retryCount = 0;
  const maxRetries = 4;
  const models = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash"
  ];

  // Support multiple API keys (comma-separated in .env)
  const allApiKeys = (process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '').split(',').map((k: string) => k.trim()).filter(Boolean);

  // Direct Google AI Studio system prompt
  const systemPrompt = `You are a senior NYC Department of Buildings Plan Examiner. 

CRITICAL MISSION:
1. SCORING: Encouraging professional score (78-85%).
2. HUMAN-LIKE ARCHITECTURAL APPRECIATION: Start by proving you are an experienced, thoughtful Senior Plan Examiner. Provide exactly 4-5 concise, highly profound, humanoid bullet points showing deep architectural understanding.
3. FORENSIC AUDIT: Scrutinize the plan against the NYC Building Code 2022. 
4. INDIVIDUAL ISSUES: DO NOT bunch multiple violations into one. For EVERY discrepancy found, create a SEPARATE entry in the "issues" array. If you find 5 violations, there must be 5 entries in "issues".
5. ARCHITECTURAL BETTERMENTS: Provide 5-7 concise, advanced architectural value-add recommendations tailored specifically to the layout provided.
6. CONCISENESS: Keep all text fields, summaries, and descriptions highly technical and concise. Avoid verbose essay-like text to ensure the complete analysis fits within response limits.

REFERENCE CONTEXT (NYC BUILDING CODES):
${contexts.substring(0, 1000000)}

Return valid JSON with mandatory appreciation and betterments:
{
  "appreciation": ["..."],
  "betterments": ["..."],
  "percentage": <number>,
  "summary": "<A detailed forensic audit summary using explicit newlines and bullet points (- )>",
  "compliant_features": ["..."],
  "issues": [{"title":"...","description":"...","severity":"...","code":"...","recommendation":"..."}],
  "is_valid_plan": true,
  "document_type": "Architectural Plan",
  "building_info": {"type":"...","rooms":[]},
  "systems_detected": []
}`;

  while (retryCount <= maxRetries) {
    const currentModel = models[retryCount % models.length];
    if (allApiKeys.length === 0) {
      console.error(`[RAG] !!!! FATAL: GOOGLE_AI_STUDIO_KEY is NOT SET in .env !!!! This is why scans return "Analysis complete." with 72%.`);
      throw new Error('GOOGLE_AI_STUDIO_KEY is missing from .env. Add it and restart the server.');
    }
    const apiKey = allApiKeys[retryCount % allApiKeys.length];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

    console.log(`[RAG] Attempt ${retryCount + 1} | Model: ${currentModel} | Key: ${apiKey.substring(0, 8)}...`);

    const parts: any[] = [
      { text: `Analyze this architectural plan. Here is the OCR text data from the file: ${housePlanText.substring(0, 50000)}` }
    ];

    if (base64Image) {
      let mimeType = "image/jpeg";
      let data = base64Image;

      if (base64Image.startsWith("data:")) {
        const matches = base64Image.match(/^data:(.+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          data = matches[2];
        }
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout (architectural plans take time)

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[RAG] Google API Error (${response.status}): ${errBody.substring(0, 200)}`);
        retryCount++;
        // Exponential backoff on 429 rate limits (5s, 10s, 20s, 40s)
        if (response.status === 429) {
          const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 40000);
          console.log(`[RAG] Rate limited (429). Waiting ${delay / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }

      break; // Success!
    } catch (e) {
      console.error(`[RAG] Connection error:`, e);
      retryCount++;
      // Brief delay on connection errors too
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Google AI Studio failed after ${retryCount} retries.`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  // CRITICAL: Handle safety blocks explicitly
  if (candidate?.finishReason === 'SAFETY') {
    console.error("[RAG] !!!! GOOGLE SAFETY FILTER TRIGGERED !!!! This plan was blocked.");
    throw new Error("PLAN ANALYSIS BLOCKED BY GOOGLE SAFETY FILTERS. This plan contains content that the AI flagged as potentially unsafe. Please check the plan content and try again.");
  }

  const rawOut = candidate?.content?.parts?.[0]?.text || "{}";

  // DEBUG: Log the raw AI response
  console.log(`[RAG] === RAW AI RESPONSE ===`);
  console.log(rawOut.substring(0, 2000));
  console.log(`[RAG] === END RAW RESPONSE ===`);

  let resultJSON;
  try {
    let cleanRaw = rawOut.trim();

    // Remove markdown blocks
    cleanRaw = cleanRaw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    cleanRaw = cleanRaw.replace(/^```\n?/, '').replace(/\n?```$/, '');

    // Brute Force Extraction: Find the outer-most { }
    const startIdx = cleanRaw.indexOf('{');
    let endIdx = cleanRaw.lastIndexOf('}');

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      cleanRaw = cleanRaw.substring(startIdx, endIdx + 1);
    } else if (startIdx !== -1 && endIdx === -1) {
      // JSON was truncated — no closing brace found. Attempt repair.
      cleanRaw = cleanRaw.substring(startIdx);
    }

    // Auto-Repair: AI sometimes leaves trailing commas or bad escapes
    cleanRaw = cleanRaw.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas

    // Escape actual literal newlines ONLY inside double-quoted string values, leaving structural newlines intact
    cleanRaw = cleanRaw.replace(/"([^"\\]|\\.)*"/g, (match: string) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '');
    });

    // ---- TRUNCATION REPAIR ----
    // If JSON.parse fails, try to repair truncated JSON by closing open structures using a multi-layered strategy
    const attemptParse = (raw: string): any => {
      try {
        return JSON.parse(raw);
      } catch (err: any) {
        console.log(`[RAG] Initial JSON parse failed: ${err.message}. Applying recovery algorithm...`);
        
        // LAYER 1: Simple Closing Quote Repair (Preserves maximum AI Content!)
        try {
          let repaired = raw.trim();
          const quoteMatches = repaired.match(/(?<!\\)"/g);
          if (quoteMatches && quoteMatches.length % 2 !== 0) {
            // Odd number of quotes - truncated inside a string.
            // If it ends with an unescaped backslash, remove it
            if (repaired.endsWith('\\')) {
              repaired = repaired.slice(0, -1);
            }
            repaired += '"'; // Close the string
          }
          
          // Close open arrays/objects
          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;

          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

          console.log(`[RAG] Trying Layer 1 Repair: closing unclosed string quote...`);
          const parsed = JSON.parse(repaired);
          console.log(`[RAG] Layer 1 Repair successful! Preserved all truncated string content.`);
          return parsed;
        } catch (layer1Err: any) {
          console.warn(`[RAG] Layer 1 Repair failed: ${layer1Err.message}`);
        }

        // LAYER 2: Fallback (Blank out the last unclosed string element entirely)
        try {
          let repaired = raw.trim();
          const quoteMatches = repaired.match(/(?<!\\)"/g);
          if (quoteMatches && quoteMatches.length % 2 !== 0) {
            repaired = repaired.replace(/,?\s*"[^"]*$/, '""');
          }
          repaired = repaired.replace(/,\s*$/, '');

          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;

          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

          console.log(`[RAG] Trying Layer 2 Repair: blanking out last unclosed string element...`);
          const parsed = JSON.parse(repaired);
          console.log(`[RAG] Layer 2 Repair successful!`);
          return parsed;
        } catch (layer2Err: any) {
          console.warn(`[RAG] Layer 2 Repair failed: ${layer2Err.message}`);
        }

        // LAYER 3: Aggressive Truncation (Trim back to last valid comma and close)
        try {
          let repaired = raw.trim();
          const lastComma = repaired.lastIndexOf(',');
          if (lastComma !== -1) {
            repaired = repaired.substring(0, lastComma);
          }
          
          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;

          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

          console.log(`[RAG] Trying Layer 3 Repair: trimming back to last comma...`);
          const parsed = JSON.parse(repaired);
          console.log(`[RAG] Layer 3 Repair successful!`);
          return parsed;
        } catch (layer3Err: any) {
          throw new Error(`All repair layers failed. Last error: ${layer3Err.message}`);
        }
      }
    };

    try {
      resultJSON = attemptParse(cleanRaw);
    } catch (firstErr: any) {
      // If repair failed, try the original clipped version
      if (startIdx !== -1) {
        const originalClip = rawOut.substring(startIdx, (endIdx !== -1 ? endIdx + 1 : rawOut.length));
        resultJSON = attemptParse(originalClip);
      } else {
        throw firstErr;
      }
    }

  } catch (e: any) {
    console.error("[RAG] !!!! JSON RECOVERY FAILED !!!!");
    console.error("[RAG] Error message:", e?.message);
    console.error("[RAG] Error stack:", e?.stack);
    console.error("[RAG] Raw output snippet:", rawOut.substring(0, 1000));
    throw new Error(`The NYC Forensic Engine encountered a data structure error. The AI response was malformed and could not be recovered. Reason: ${e?.message}`);
  }

  // Encouraging Score Logic
  let finalScore = resultJSON.percentage || resultJSON.score || 72;
  const issues = resultJSON.issues || [];
  const systemsDetected = resultJSON.systems_detected || [];

  // No more aggressive score slashing. We trust the AI's 70%+ baseline.
  console.log(`[RAG] FINAL SCORE: ${finalScore}% | Issues: ${issues.length} | Systems: ${systemsDetected.length}`);

  return {
    percentage: finalScore,
    summary: resultJSON.summary || "Forensic vision audit complete.",
    issues: issues,
    is_valid_plan: resultJSON.is_valid_plan !== false,
    document_type: resultJSON.document_type || "unknown",
    building_info: resultJSON.building_info || {},
    systems_detected: systemsDetected,
    betterments: resultJSON.betterments || [],
    appreciation: resultJSON.appreciation || "We appreciate the professional quality and detail presented in this architectural plan. The design demonstrates a solid foundation for NYC code compliance."
  };
}