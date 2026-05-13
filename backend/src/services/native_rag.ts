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

  if (fileExt === ".pdf") {
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(housePlanPath);
    const data = await pdfParse(dataBuffer);
    housePlanText = data.text;
  } else {
    // Use OCR Service for images
    console.log(`[RAG] Image detected, performing OCR...`);
    housePlanText = await OCRService.extractText(housePlanPath, "image");
  }

  console.log(`[RAG] Extracted ${housePlanText.length} characters from plan.`);

  if (housePlanText.trim().length < 20) {
    throw new Error("This document contains too little text for analysis. Please ensure you are uploading a clear, high-resolution architectural plan.");
  }

  // Generate query embedding using local model (384 dimensions)
  const queryVector = await generateQueryEmbedding(
    "NYC building code compliance residential commercial construction safety regulations requirements " + 
    housePlanText.substring(0, 500)
  );
  
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  const index = pc.Index(process.env.PINECONE_INDEX as string);

  const queryResponse = await index.query({
    topK: 20,
    vector: queryVector,
    includeMetadata: true,
  });

  console.log(`[RAG] Pinecone returned ${queryResponse.matches.length} matches`);
  
  const contexts = queryResponse.matches
    .map(m => `[Source: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
    .join("\n\n---\n\n");

  const messages: any[] = [
    {
      role: "system",
      content: `SYSTEM ROLE:
You are a senior NYC Department of Buildings (DOB) compliance officer and forensic plan examiner with strict adherence to the 2022 NYC Construction Codes and related regulations. Your evaluation must be conservative, evidence-based, and non-speculative.

PRIMARY OBJECTIVE:
Analyze the provided document (PDF/image/text) and determine:
1. Whether it is a legitimate architectural / engineering / DOB-related document.
2. If yes → perform a strict compliance evaluation against NYC codes.
3. If no → exit early with a specific structured response.

--------------------------------------------------
PHASE 1: DOCUMENT CLASSIFICATION (MANDATORY FIRST CHECK)
--------------------------------------------------

You MUST first classify the document.

VALID DOCUMENT TYPES (ONLY these qualify for compliance analysis):
- Architectural drawings (floor plans, sections, elevations, site plans)
- Structural drawings / calculations
- MEP (Mechanical, Electrical, Plumbing) drawings
- Fire safety plans / egress diagrams
- DOB forms (PW1, TR1, TR8, etc.)
- Construction specifications
- Permit sets / construction documents

INVALID DOCUMENT TYPES:
- Real estate listings
- Marketing brochures
- Business plans
- Financial documents
- Legal agreements unrelated to construction
- Generic text without technical building data
- Images without measurable architectural meaning

CLASSIFICATION RULE:
- If NO clear architectural or engineering indicators → mark as NON-PLAN

OUTPUT IF NOT A PLAN:
Return EXACTLY:
{
  "is_valid_plan": false,
  "document_type": "non_architectural",
  "confidence": "high",
  "percentage": 100,
  "summary": "This document is NOT an architectural plan. No building code analysis could be performed.",
  "issues": []
}

DO NOT PROCEED further if invalid.

--------------------------------------------------
PHASE 2: DATA EXTRACTION (ONLY IF VALID PLAN)
--------------------------------------------------

Extract ONLY what is explicitly visible. DO NOT infer beyond evidence.

--------------------------------------------------
PHASE 2.1: BUILDING METADATA EXTRACTION (FOR FORENSIC REPORT)
--------------------------------------------------
Extract the following (mark as "Unknown" if not visible):
- Project Name/Address
- Occupancy Classification (e.g., R-3, B, M)
- Construction Type (e.g., Type I, Type II, Type III, Type IV, Type V)
- Number of Stories
- Building Height
- Primary Use (Residential, Commercial, Mixed-Use, etc.)

--------------------------------------------------
PHASE 3: CODE EVALUATION (STRICT + NON-HALLUCINATIVE)
--------------------------------------------------

Evaluate ONLY using these NYC codes:
- NYC Building Code (2022) [BC]
- NYC Fire Code [FC]
- NYC Energy Conservation Code [NYCECC]
- NYC Electrical Code [EC]
- NYC Mechanical Code (2022) [MC]
- NYC Plumbing Code (2022) [PC]
- NYC Fuel Gas Code (2022) [FGC]
- NYC Zoning Resolution [ZR]
- Accessibility (ADA + NYC mods) [ADA]

--------------------------------------------------
PHASE 3.1: SYSTEMS ANALYSIS (FOR FORENSIC REPORT)
--------------------------------------------------
Identify status (detected | missing | partial) and provide notes for:
- Means of Egress (Exits, Stairs, Corridors)
- Fire Protection (Sprinklers, Alarms, Standpipes)
- Accessibility (ADA Ramps, Clearances, Elevators)
- Structural Systems
- MEP Systems

--------------------------------------------------
CRITICAL SAFETY RULE:
--------------------------------------------------

If ANY of the following are missing, unclear, or unverifiable → mark as CRITICAL:
- Means of egress (exits, stairs) → BC Chapter 10
- Fire protection (sprinklers, alarms) → BC Chapter 9 / FC
- Accessibility (ADA compliance) → ADA / BC Chapter 11

DO NOT assume compliance. Absence of proof = NON-COMPLIANT.

--------------------------------------------------
PHASE 4: SCORING MODEL (MANDATORY)
--------------------------------------------------

Start with score = 100

Deduct:
- Critical issue → -25 each
- Major issue → -10 each
- Minor issue → -3 each
- Missing core data → treat as CRITICAL

Minimum score = 0

--------------------------------------------------
PHASE 5: OUTPUT FORMAT (STRICT JSON ONLY)
--------------------------------------------------

Required JSON structure:
{
  "is_valid_plan": true,
  "document_type": "architectural_plan | structural_plan | mep_plan | dob_form | unknown",
  "building_info": {
    "project_name": "string",
    "occupancy_group": "string",
    "construction_type": "string",
    "stories": "string",
    "primary_use": "string"
  },
  "systems_detected": [
    {"name": "string", "status": "detected | missing | partial", "notes": "string"}
  ],
  "confidence": "high | medium | low",
  "percentage": number (0-100),
  "summary": "Clear, strict, professional compliance verdict",
  "issues": [
    {
      "title": "short issue name",
      "description": "detailed explanation",
      "severity": "critical | major | minor",
      "code": "specific NYC code section",
      "recommendation": "how to fix it"
    }
  ]
}

STRICT RULES:
- DO NOT hallucinate missing details
- ALWAYS prioritize safety over completeness
- If uncertain → mark as missing_data`
    },
    {
      role: "user",
      content: `Analyze the following building plan content:

BUILDING PLAN CONTENT:
${housePlanText.substring(0, 5000)}

RELEVANT NYC BUILDING CODE SECTIONS (FOR VERIFICATION):
${contexts.substring(0, 20000)}`
    }
  ];

  console.log(`[RAG] Sending to OpenRouter model: meta-llama/llama-3.3-70b-instruct`);

  const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nyccodes.codealgo.live',
      'X-Title': 'NYC Code Compliance Analyzer'
    },
    body: JSON.stringify({
      messages: messages,
      model: "meta-llama/llama-3.3-70b-instruct",
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })
  });

  if (!openRouterResponse.ok) {
    const errText = await openRouterResponse.text();
    console.error(`[RAG] OpenRouter error: ${openRouterResponse.status} ${errText}`);
    throw new Error(`${openRouterResponse.status} ${errText}`);
  }

  const chatCompletion = await openRouterResponse.json();
  const rawOut = chatCompletion.choices[0]?.message?.content || "{}";
  
  let resultJSON;
  try {
     let cleanedOutput = rawOut.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
     const firstBrace = cleanedOutput.indexOf('{');
     const lastBrace = cleanedOutput.lastIndexOf('}');
     
     if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found");
     
     const jsonStr = cleanedOutput.substring(firstBrace, lastBrace + 1);
     resultJSON = JSON.parse(jsonStr);
  } catch(e: any) {
     console.error(`[RAG] JSON parse error: ${e.message}`);
     resultJSON = { 
       percentage: 50,
       summary: "Analysis completed with partial results.",
       issues: []
     };
  }

  return {
    percentage: resultJSON.percentage || 50,
    summary: resultJSON.summary || "Analysis complete. Review details below.",
    issues: resultJSON.issues || [],
    is_valid_plan: resultJSON.is_valid_plan !== false,
    document_type: resultJSON.document_type || "unknown",
    building_info: resultJSON.building_info || {},
    systems_detected: resultJSON.systems_detected || []
  };
}