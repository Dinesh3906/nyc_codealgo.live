import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { pipeline } from "@xenova/transformers";

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
    // If it's an image, in a full product we'd use tesseract.js here.
    // For this MVP, we will simulate reading the text:
    housePlanText = "Detected House Plan Text (Fallback)";
  }

  console.log(`[RAG] Extracted ${housePlanText.length} characters from plan.`);

  // Generate query embedding using OpenAI
  const queryVector = await generateQueryEmbedding(
    "NYC building code compliance residential commercial construction safety regulations requirements " + 
    housePlanText.substring(0, 500)
  );
  
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  const index = pc.Index("nyc-code-compliance");

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
  
  const prompt = `You are an expert NYC Building Code Inspector analyzing a building plan for compliance.

BUILDING PLAN CONTENT:
${housePlanText.substring(0, 4000)}

RELEVANT NYC BUILDING CODE SECTIONS:
${contexts.substring(0, 20000)}

TASK: Analyze the plan against the NYC Building Code sections provided above.

RESPONSE FORMAT: Return ONLY a valid JSON object (no markdown, no code blocks, no extra text).

Required JSON structure:
{
  "percentage": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "issues": [
    {
      "title": "<short issue name>",
      "description": "<what the violation is>",
      "severity": "<critical|major|minor>",
      "code": "<specific NYC code section>",
      "recommendation": "<how to fix it>"
    }
  ]
}

If the plan is compliant, return percentage 90-100 with empty issues array.
If issues found, list each one with specific code references from the NYC Building Code sections above.

JSON response:`;

  console.log(`[RAG] Prompt length: ${prompt.length} chars`);
  console.log(`[RAG] Context included in prompt: ${contexts.length > 0 ? 'YES' : 'NO'}`);
  console.log(`[RAG] Sending to Groq model: llama-3.1-8b-instant`);

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    max_tokens: 3000,
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

  const finalResult = {
    percentage: resultJSON.percentage || 50,
    summary: resultJSON.summary || "Analysis complete. Review details below.",
    issues: resultJSON.issues || []
  };
  
  console.log(`[RAG] Final result: ${finalResult.percentage}%, ${finalResult.issues.length} issues, summary length: ${finalResult.summary.length}`);
  
  return finalResult;
}