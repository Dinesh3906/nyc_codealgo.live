import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { pipeline } from "@xenova/transformers";
import { OCRService } from "./ocr.service";

// Function to generate query embedding using Pinecone server-side model
async function generateQueryEmbedding(text: string, pc: Pinecone): Promise<number[]> {
  const model = "llama-text-embed-v2";
  console.log(`[RAG] Generating embedding via Pinecone Inference (${model})...`);
  
  const embeddings = await pc.inference.embed(
    model,
    [text],
    { inputType: 'query' }
  );
  
  return Array.from(embeddings.data[0].values as number[]);
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

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });

  // Generate query embedding using Pinecone server-side model (1024 dimensions)
  const queryVector = await generateQueryEmbedding(
    "NYC building code compliance residential commercial construction safety regulations requirements " + 
    housePlanText.substring(0, 500),
    pc
  );
  const index = pc.Index(process.env.PINECONE_INDEX as string);

  const queryResponse = await index.query({
    topK: 20,
    vector: queryVector,
    includeMetadata: true,
  });

  console.log(`[RAG] Pinecone returned ${queryResponse.matches.length} matches`);
  
  // Log top 3 matches to verify relevance
  queryResponse.matches.slice(0, 3).forEach((match, idx) => {
    console.log(`[RAG] Match ${idx + 1}: score=${match.score?.toFixed(3)}, source=${match.metadata?.source}`);
  });

  const contexts = queryResponse.matches
    .map(m => `[Source: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
    .join("\n\n---\n\n");

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  console.log(`[RAG] Retrieved context: ${contexts.length} chars from ${queryResponse.matches.length} documents`);
  console.log(`[RAG] Context preview (first 300 chars): ${contexts.substring(0, 300)}...`);
  
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
${housePlanText.substring(0, 4000)}

RELEVANT NYC BUILDING CODE SECTIONS:
${contexts.substring(0, 20000)}`
    }
  ];

  console.log(`[RAG] Sending to Groq model: llama-3.1-8b-instant`);

  const chatCompletion = await groq.chat.completions.create({
    messages: messages,
    model: "llama-3.1-8b-instant",
    temperature: 0,
    max_tokens: 3000,
    response_format: { type: "json_object" }
  });

  const rawOut = chatCompletion.choices[0]?.message?.content || "{}";
  console.log(`[RAG] Groq response length: ${rawOut.length} chars`);
  console.log(`[RAG] Full Groq response:\n${rawOut}`);
  console.log(`[RAG] ` + '='.repeat(80));
  
  let resultJSON;
  try {
     // Remove markdown code blocks if present
     let cleanedOutput = rawOut.trim();
     
     // Remove ```json and ``` markers
     cleanedOutput = cleanedOutput.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
     
     // Extract JSON object - find the first { and last }
     const firstBrace = cleanedOutput.indexOf('{');
     const lastBrace = cleanedOutput.lastIndexOf('}');
     
     if (firstBrace === -1 || lastBrace === -1) {
       throw new Error("No JSON object found in response");
     }
     
     const jsonStr = cleanedOutput.substring(firstBrace, lastBrace + 1);
     console.log(`[RAG] Attempting to parse JSON (${jsonStr.length} chars)...`);
     
     resultJSON = JSON.parse(jsonStr);
     console.log(`[RAG] ✓ Parsed successfully: ${resultJSON.percentage}%, ${resultJSON.issues?.length || 0} issues`);
     
     // Validate the structure
     if (!resultJSON.percentage) {
       console.warn(`[RAG] Warning: No percentage in response`);
       resultJSON.percentage = 50;
     }
     if (!resultJSON.summary) {
       console.warn(`[RAG] Warning: No summary in response`);
       resultJSON.summary = "Analysis completed";
     }
     if (!Array.isArray(resultJSON.issues)) {
       console.warn(`[RAG] Warning: Issues is not an array, converting...`);
       resultJSON.issues = [];
     }
     
  } catch(e: any) {
     console.error(`[RAG] ✗ JSON parse error: ${e.message}`);
     console.error(`[RAG] Raw output for debugging:\n${rawOut}`);
     
     // Fallback: extract what we can from the text
     const percentMatch = rawOut.match(/(\d+)%/);
     const percentage = percentMatch ? parseInt(percentMatch[1]) : 50;
     
     // Try to extract a summary from the text
     let summary = "Analysis completed. The building plan has been reviewed against NYC Building Code.";
     const summaryMatch = rawOut.match(/summary["\s:]+([^"]+)/i);
     if (summaryMatch) {
       summary = summaryMatch[1].substring(0, 200);
     }
     
     resultJSON = { 
       percentage,
       summary,
       issues: []
     };
     
     console.log(`[RAG] Using fallback values: ${percentage}%, 0 issues`);
  }

  return {
    percentage: resultJSON.percentage || 50,
    summary: resultJSON.summary || "Analysis complete. Review details below.",
    issues: resultJSON.issues || [],
    is_valid_plan: resultJSON.is_valid_plan !== false, // default to true if missing
    document_type: resultJSON.document_type || "unknown"
  };
}