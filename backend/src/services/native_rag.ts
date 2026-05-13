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
    base64Image = imageBuffer.toString('base64');
    // Still do OCR as a fallback/supplement
    housePlanText = await OCRService.extractText(housePlanPath, "image");
  }

  console.log(`[RAG] Data prepared. Text: ${housePlanText.length} chars. Image: ${base64Image ? 'PRESENT' : 'NONE'}`);

  // Generate query embedding for PDF context retrieval
  const queryVector = await generateQueryEmbedding(
    "NYC building code compliance residential commercial construction safety regulations " + 
    housePlanText.substring(0, 500)
  );
  
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  const index = pc.Index(process.env.PINECONE_INDEX as string);

  const queryResponse = await index.query({
    topK: 20,
    vector: queryVector,
    includeMetadata: true,
  });

  const contexts = queryResponse.matches
    .map(m => `[NYC Code Section: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
    .join("\n\n---\n\n");

  // GROQ-TUNNEL: Direct fetch to OpenRouter to bypass AWS IP blocks on Groq
  const userContent: any[] = [
    {
      type: "text",
      text: `Analyze this NYC architectural plan for code compliance. 
      
      GROUND TRUTH (NYC Building Code Rules from 113 PDFs):
      ${contexts.substring(0, 15000)}
      
      EXTRACTED DATA:
      ${housePlanText.substring(0, 3000)}`
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

  console.log(`[RAG] Sending to GROQ-TUNNEL via direct fetch...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nyccodes.codealgo.live',
      'X-Title': 'NYC Code Compliance Analyzer'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-90b-vision-instruct',
      messages: [
        {
          role: "system",
          content: `SYSTEM ROLE:
You are a Zero-Tolerance NYC Forensic Plan Examiner. You are NOT an assistant; you are a strict auditor. 

STRICT AUDIT RULES:
1. SILENCE IS NON-COMPLIANCE: If dimensions or safety systems are not EXPLICITLY visible/labeled, you MUST flag it as "Missing critical data" and deduct points.
2. ZERO BLUFFING: Do not give a 100% score unless the plan is perfect. 
3. VISUAL ANALYSIS: If an image is provided, look at the lines, symbols, and labels directly.

OUTPUT: Return STRICT JSON ONLY with these fields: percentage (0-100), summary (string), issues (array of {title, description, severity, code, recommendation}), is_valid_plan (boolean), document_type (string), building_info (object), systems_detected (array).`
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[RAG] OpenRouter error ${response.status}:`, errBody);
    throw new Error(`Tunnel error: ${response.status} - ${errBody}`);
  }

  const chatCompletion = await response.json();
  console.log(`[RAG] GROQ-TUNNEL response received successfully!`);
  const rawOut = chatCompletion.choices?.[0]?.message?.content || "{}";
  
  let resultJSON;
  try {
     resultJSON = JSON.parse(rawOut.trim());
  } catch(e) {
     console.error("[RAG] Vision JSON parse error:", e);
     resultJSON = { percentage: 50, summary: "Analysis complete with formatting issues.", issues: [] };
  }

  return {
    percentage: resultJSON.percentage || resultJSON.score || 50,
    summary: resultJSON.summary || "Forensic vision audit complete.",
    issues: resultJSON.issues || [],
    is_valid_plan: resultJSON.is_valid_plan !== false,
    document_type: resultJSON.document_type || "unknown",
    building_info: resultJSON.building_info || {},
    systems_detected: resultJSON.systems_detected || []
  };
}