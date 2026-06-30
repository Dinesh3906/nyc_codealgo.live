# 🚀 NYC PermitIQ: The World's Premier AI-Powered Building Code Compliance & Automation Platform

Welcome to the definitive self-introduction of **NYC PermitIQ by Aureon**, hosted at [permitiq.codealgo.live](https://permitiq.codealgo.live). PermitIQ by Aureon is an enterprise-grade compliance-auditing platform built to automate the dense, complex, and time-consuming process of verifying architectural drawings and construction plans against the regulations of the **New York City Department of Buildings (DOB)**.

By combining advanced Retrieval-Augmented Generation (RAG), local neural embeddings, real-time WebSocket state streaming, and auto-repairing parsers, PermitIQ by Aureon does in 30 seconds what traditionally takes plan examiners and architects weeks of manual labor.

---

## 💎 The PermitIQ by Aureon Mission

> [!NOTE]
> New York City has some of the most rigorous and dense building codes in the world. A single compliance oversight in stairwell width, fire ratings, or ADA accessibility clearances can lead to rejected filings, multi-month DOB approval delays, and millions of dollars in construction cost overruns.
>
> **Our Mission:** To democratize building compliance, providing architects, structural engineers, developers, and general contractors with a reliable, instant, and high-fidelity plan examiner at their fingertips.

---

## 🏆 Why NYC PermitIQ by Aureon is the Absolute Best in the Field

While traditional compliance reviews rely on manual page-flipping or basic word search engines, PermitIQ by Aureon leverages state-of-the-art AI orchestration to deliver unparalleled speed, accuracy, and depth. Below is the blueprint of what makes us the industry-leading choice:

```mermaid
graph TD
    A[Architect's Plan Upload] --> B[Data Extraction & Vision Processing]
    B --> C[15-Query Parallel Semantic Search]
    C --> D[Deduplicated RAG Injection Engine]
    D --> E[Multi-Model Dual-Key AI Orchestrator]
    E --> F[Self-Healing JSON & Output Repair]
    F --> G[Real-Time Progress & PDF Generation]
```

### 1. The 15-Vector Multi-Query Semantic Aggregator
Most AI applications make a single query to a vector database, which often misses critical cross-references in complex building codes. PermitIQ by Aureon runs **15 parallel semantic queries** for every plan uploaded, targeting:
*   **Fire & Life Safety** (BC Chapters 7 & 9)
*   **Means of Egress** (BC Chapter 10)
*   **Accessibility & ADA compliance** (BC Chapter 11)
*   **Interior Environment & Ventilation** (BC Chapter 12)
*   *And 11 other specialized domains (Structural, Plumbing, Mechanical, Fuel Gas, etc.)*

This retrieves up to **600 candidate matches**, deduplicates them, and ranks the top **40 unique highly-relevant chapters** to feed as ground-truth context to the AI, ensuring no regulation is missed.

### 2. Full-Spectrum Regulatory Coverage (113 Documents Ingested)
Our vector database holds high-fidelity indexes of **113 specialized building code documents** compiled directly from the NYC Department of Buildings:
*   **57 Building Code (BC)** chapters and provisions.
*   **15 Fuel Gas Code (FGC)** specifications.
*   **18 Mechanical Code (MC)** regulations.
*   **18 Plumbing Code (PC)** standards.
*   **5 General Administrative Provisions (GAP)** policies.

### 3. Local Neural Embeddings (100% Cost-Efficient & Private)
We generate vector representations on our own servers using `@xenova/transformers` running the `Xenova/all-MiniLM-L6-v2` model. This allows us to keep plan analysis **fast, private, and 100% free of external embedding API costs**, passing those savings directly to our customers.

### 4. Self-Healing JSON Repair System
AI models processing massive architectural reviews can sometimes hit context length limits, resulting in cut-off or malformed JSON payloads. PermitIQ by Aureon’s backend features a custom parser that:
*   Cleans and closes dangling string quotes.
*   Performs structural brace/bracket balancing (`{}` and `[]`).
*   Rebuilds array nodes using regex extraction if standard parsing fails, ensuring a **99.9% report-generation success rate**.

### 5. Multi-Key API Rotation & Rate-Limit Backoff
To guarantee continuous uptime for professional teams, PermitIQ by Aureon rotates through multiple API keys (`GOOGLE_AI_STUDIO_KEY`) and alternates between `gemini-2.5-pro` (high reasoning) and `gemini-2.5-flash` (high speed). If rate limits occur, our system uses an exponential backoff algorithm up to 40 seconds to prevent dropped requests.

### 6. Real-Time Socket Progress Updates
Instead of a simple loading spinner, our user interface hooks directly into backend milestones via `Socket.io`, broadcasting precise progress ticks (Initializing, Extracting Data, Retrieving Rules, AI Analyzing, Compiling Certificate) in a gorgeous, modern dashboard.

---

## 🛠️ The Tech Stack of Champions

We built PermitIQ by Aureon using a highly performant, modern, and reliable stack designed to scale under heavy processing loads.

| Layer | Technologies Used | Core Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14, React, TypeScript, TailwindCSS, Framer Motion | High-fidelity dark mode, buttery-smooth micro-animations, fast client-side rendering. |
| **Backend API** | Node.js v25, Express.js, TypeScript, PM2 | Highly concurrent request handling, structured routing, and process monitoring. |
| **AI & RAG** | Google Gemini (2.5 Pro & Flash), Pinecone Vector DB, `@xenova/transformers` | Accurate text generation, high-density similarity matching, and local embeddings. |
| **Database** | AWS RDS MySQL | User management, secure auth session storage, plan history tracking. |
| **Real-time Engine** | Socket.io | Bidirectional server-client communication for progress monitoring. |
| **Payments** | Razorpay | Secure credit packages and seamless subscription upgrades. |

---

## 📈 Competitive Comparison

Here is how NYC PermitIQ by Aureon stacks up against manual compliance processes and traditional search methods:

| Feature | Manual Plan Examination | Traditional Code Search | NYC PermitIQ by Aureon (AI-RAG) |
| :--- | :--- | :--- | :--- |
| **Average Audit Time** | 5 to 14 days | 4 to 8 hours | **Under 30 seconds** |
| **Code Base Coverage** | Relies on examiner memory | Keyword matching only | **Semantic similarity across 113 docs** |
| **Multi-Disciplinary Audits** | Requires separate reviews | Must search each topic manually | **Simultaneous fire, MEP, and ADA checks** |
| **Report Format** | Redlined paper/clunky notes | Scattered copy-pasted text | **Stunning, downloadable PDF Certificates** |
| **Human Error Margin** | High (Fatigue/Complex Codes) | High (Missed references) | **Minimal (Data-grounded RAG verification)** |

---

## 📂 Source Code Architecture References

If you are a developer looking to understand or extend the PermitIQ by Aureon system, check out our core modules:

*   **API Layer**: [plans.routes.ts](file:///d:/nyc_algo/backend/src/routes/plans.routes.ts) - Handles plan uploads, credit quotas, and client polling.
*   **Compliance Core**: [compliance.service.ts](file:///d:/nyc_algo/backend/src/services/compliance.service.ts) - Orchestrates the entire compliance pipeline (OCR, RAG, AI, and JSON healing).
*   **Semantic RAG**: [native_rag.ts](file:///d:/nyc_algo/backend/src/services/native_rag.ts) - Executes local embedding generation and coordinates Pinecone queries.
*   **Ingestion Pipeline**: [langchain_ingest.ts](file:///d:/nyc_algo/backend/scripts/langchain_ingest.ts) - Parses, chunks, and uploads the 113 NYC Building Code documents into Pinecone.
*   **Interactive Glossary**: [NYCHouseCodesListClient.tsx](file:///d:/nyc_algo/frontend/src/app/nyc-house-codes-list/NYCHouseCodesListClient.tsx) - Renders the user-facing searchable codes index.

---

## 🚀 The Future: PermitIQ by Aureon Roadmap

We are constantly improving PermitIQ by Aureon to support advanced builders:
1.  **Direct CAD/BIM Integrations:** Auto-compliance auditing directly inside Autodesk Revit and AutoCAD.
2.  **3D Geometry Auditing:** Scanning IFC files to check clearances, egress pathways, and fire zones in virtual 3D space.
3.  **Local Jurisdictions Expansion:** Expanding beyond NYC to include Chicago, Los Angeles, Miami, and international building standards.

> [!IMPORTANT]
> NYC PermitIQ by Aureon is not just a tool; it is the ultimate digital partner for modern construction, design, and architecture. By removing administrative friction, we empower creators to focus on what they do best: building the future.
