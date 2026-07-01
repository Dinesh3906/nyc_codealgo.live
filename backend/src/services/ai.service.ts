import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  throw new Error('GROQ_API_KEY environment variable is required');
}

const groq = new Groq({
  apiKey: groqApiKey,
});

export interface ComplianceReport {
  compliant: boolean;
  score: number;
  summary: string;
  issues: { type: string; description: string; code: string; severity: 'high' | 'medium' | 'low' }[];
  suggestions: string[];
}

export class AIService {
  static async analyzeCompliance(text: string): Promise<ComplianceReport> {
    // Legacy support or fallback
    return this.analyzeWithGrounding(text, []);
  }

  static async analyzeWithGrounding(text: string, rules: any[]): Promise<any> {
    try {
      const formattedRules = rules.slice(0, 20).map(r => `[${r.id}] ${r.title}: ${r.description}`).join('\n');

      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        messages: [
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
  "compliant": true,
  "document_type": "non_architectural",
  "confidence": "high",
  "summary": "This document is NOT an architectural plan. No building code analysis could be performed.",
  "issues": []
}

DO NOT PROCEED further if invalid.

--------------------------------------------------
PHASE 2: DATA EXTRACTION (ONLY IF VALID PLAN)
--------------------------------------------------

Extract ONLY what is explicitly visible. DO NOT infer beyond evidence.

Extract:
- Building type (residential, commercial, mixed-use, unknown)
- Occupancy group (if mentioned)
- Number of floors
- Presence of:
  - Staircases
  - Exits
  - Elevators
  - Fire protection systems
  - HVAC systems
  - Plumbing systems
  - Gas systems
  - Electrical panels
  - Accessibility features
- Dimensions (if labeled)
- Notes, legends, symbols

If any required element is NOT explicitly shown → mark as "missing".

--------------------------------------------------
PHASE 3: CODE EVALUATION (STRICT + NON-HALLUCINATIVE)
--------------------------------------------------

Evaluate ONLY using these NYC codes:

CORE CODES (HIGH PRIORITY):
- NYC Building Code (2022) [BC]
- NYC Fire Code [FC]
- NYC Energy Conservation Code [NYCECC]

SECONDARY:
- NYC Electrical Code [EC]
- NYC Mechanical Code (2022) [MC]

OPTIONAL:
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
EVALUATION LOGIC:
--------------------------------------------------

For EACH detected feature:
- Compare against known code intent (not exact clause quoting unless present)
- If clearly compliant → mark compliant
- If clearly violated → mark non-compliant
- If missing → mark as "missing_data"

SEVERITY LEVELS:
- "critical" → life safety risk or missing core system
- "major" → significant compliance issue
- "minor" → small deviation
- "info" → observation

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

Return EXACT JSON:

{
  "compliant": boolean,
  "document_type": "architectural_plan | structural_plan | mep_plan | dob_form | unknown",
  "confidence": "high | medium | low",
  "building_summary": {
    "type": "...",
    "floors": "...",
    "occupancy": "...",
    "systems_detected": ["stairs", "fire", "hvac", ...]
  },
  "compliance_score": number (0-100),
  "issues": [
    {
      "code": "BC | FC | NYCECC | EC | MC | PC | FGC | ZR | ADA",
      "severity": "critical | major | minor | info",
      "title": "...",
      "description": "...",
      "evidence": "... (ONLY from document)",
      "recommendation": "..."
    }
  ],
  "summary": "Clear, strict, professional compliance verdict"
}

--------------------------------------------------
STRICT RULES (NON-NEGOTIABLE):
--------------------------------------------------

- DO NOT hallucinate missing details
- DO NOT assume compliance
- DO NOT generate fake measurements
- DO NOT skip classification phase
- ALWAYS prioritize safety over completeness
- If uncertain → mark as missing_data
- Be conservative: NYC DOB standards are strict

--------------------------------------------------
BEHAVIORAL MODE:
--------------------------------------------------

Act like:
- A strict NYC plan examiner
- A compliance auditor, not a designer
- A safety-first authority

Tone:
- Professional
- Direct
- No fluff
- No assumptions

--------------------------------------------------
FINAL GOAL:
--------------------------------------------------

Produce a deterministic, safety-focused, legally defensible compliance analysis that could be used in a real NYC DOB review workflow.`
          },
          {
            role: "user",
            content: `Analyze the following building plan content:

[EXTRACTED TEXT]
${text.substring(0, 4000)}

Relevant NYC Codes to compare against:
${formattedRules}

Return ONLY a JSON object in this format:
{
  "compliant": boolean,
  "summary": "quick overview",
  "issues": [
    {
      "title": "short issue title",
      "description": "detailed explanation",
      "severity": "critical|major|minor",
      "rule": "NYC_CODE_ID",
      "suggestion": "how to fix"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      let content = response.choices[0].message.content || '{}';

      // Safety: Clean Markdown blocks if AI hallucinated them
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        return JSON.parse(content);
      } catch (e) {
        console.error("JSON Parse Error. Content:", content);
        throw new Error("AI returned an invalid report format. Please retry.");
      }
    } catch (error: any) {
      console.error('AI Grounding Error:', error);
      throw error;
    }
  }
}
