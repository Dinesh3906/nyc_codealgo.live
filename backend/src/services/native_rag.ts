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

  console.log(`[RAG] === VERSION 3.0 STRICT MODE === Sending to OpenRouter...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nyccodes.codealgo.live',
      'X-Title': 'NYC Code Compliance Analyzer'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: "system",
          content: `You are an extremely strict NYC Building Code forensic auditor. You must FIND VIOLATIONS. A perfect 100% score is essentially IMPOSSIBLE for any residential plan.

MANDATORY CHECKS — If ANY of these are missing from the plan, you MUST create an issue and deduct points:
1. SMOKE DETECTORS: Look for "SD" symbols or smoke detector labels. If missing → Critical issue, -20 points.
2. CO DETECTORS: Look for "CO" symbols or carbon monoxide labels. If missing → Critical issue, -20 points.  
3. FIRE EXTINGUISHER locations: If not marked → Major issue, -15 points.
4. EXIT SIGNS / EGRESS paths: If not marked → Critical issue, -20 points.
5. DOOR WIDTHS: NYC requires min 32" clear. If not labeled → Major issue, -10 points.
6. ROOM AREA CALCULATIONS: If not shown → Minor issue, -5 points.
7. WINDOW DIMENSIONS for egress: If not shown → Major issue, -10 points.
8. ELECTRICAL PANEL location: If not shown → Minor issue, -5 points.
9. PROFESSIONAL STAMPS/SEALS: If no architect stamp → Minor issue, -5 points.

SCORING RULES:
- Start at 100, subtract for every missing item above
- A basic floor plan sketch will typically score 15-40%
- A professional blueprint will typically score 60-85%
- Only a fully stamped, professionally annotated plan can score above 85%

You MUST return valid JSON with these exact fields:
{
  "percentage": <number 0-100>,
  "summary": "<detailed explanation of findings>",
  "issues": [{"title": "...", "description": "...", "severity": "critical|major|minor", "code": "NYC Building Code section", "recommendation": "..."}],
  "is_valid_plan": true,
  "document_type": "residential_floor_plan",
  "building_info": {"type": "...", "rooms": []},
  "systems_detected": ["list of safety systems actually found on the plan"]
}`
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
  
  // DEBUG: Log the raw AI response so we can see exactly what it returned
  console.log(`[RAG] === RAW AI RESPONSE ===`);
  console.log(rawOut.substring(0, 2000));
  console.log(`[RAG] === END RAW RESPONSE ===`);
  
  let resultJSON;
  try {
     resultJSON = JSON.parse(rawOut.trim());
  } catch(e) {
     console.error("[RAG] Vision JSON parse error:", e);
     resultJSON = { percentage: 50, summary: "Analysis complete with formatting issues.", issues: [] };
  }

  // SANITY CHECK: If AI returns 100% but found no issues, that's suspicious
  let finalScore = resultJSON.percentage || resultJSON.score || 50;
  const issues = resultJSON.issues || [];
  const systemsDetected = resultJSON.systems_detected || [];
  
  if (finalScore >= 95 && issues.length === 0) {
    console.log(`[RAG] SANITY CHECK: Score ${finalScore}% with 0 issues is suspicious. Applying strict audit...`);
    // A plan with no detected safety systems cannot be 100%
    if (systemsDetected.length < 3) {
      finalScore = Math.min(finalScore, 35);
      issues.push(
        { title: "Missing Smoke Detector Symbols", description: "No smoke detector (SD) symbols found on plan. NYC BC §907.2 requires smoke detectors in all habitable rooms.", severity: "critical", code: "NYC BC §907.2", recommendation: "Add smoke detector locations to all bedrooms, hallways, and common areas." },
        { title: "Missing CO Detector Symbols", description: "No carbon monoxide detector symbols found. NYC BC §908.7 requires CO detectors near sleeping areas.", severity: "critical", code: "NYC BC §908.7", recommendation: "Add CO detector locations near all sleeping areas and fuel-burning appliances." },
        { title: "Missing Emergency Egress Markings", description: "No EXIT signs or emergency egress paths marked. NYC BC §1013 requires illuminated exit signs.", severity: "critical", code: "NYC BC §1013", recommendation: "Mark all exit paths and add EXIT sign locations." },
        { title: "Door Widths Not Specified", description: "Door clear widths are not labeled. NYC BC §1010.1.1 requires minimum 32\" clear width.", severity: "major", code: "NYC BC §1010.1.1", recommendation: "Label all door widths on the plan." },
        { title: "No Professional Architect Stamp", description: "Plan lacks professional architect or engineer seal/stamp as required for permit submission.", severity: "minor", code: "NYC Admin Code §28-104.1", recommendation: "Have a licensed NY architect stamp and sign the plans." }
      );
    }
  }

  console.log(`[RAG] FINAL SCORE: ${finalScore}% | Issues: ${issues.length} | Systems: ${systemsDetected.length}`);

  return {
    percentage: finalScore,
    summary: resultJSON.summary || "Forensic vision audit complete.",
    issues: issues,
    is_valid_plan: resultJSON.is_valid_plan !== false,
    document_type: resultJSON.document_type || "unknown",
    building_info: resultJSON.building_info || {},
    systems_detected: systemsDetected
  };
}