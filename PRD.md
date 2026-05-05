# Product Requirements Document (PRD): NYC Code Analyzer (NYC House Code MVP)

## 1. Product Overview
**Product Name:** NYC Code Analyzer (Feature: NYC House Code MVP)
**Description:** An AI-powered Retrieval-Augmented Generation (RAG) application designed to strictly validate architectural queries and building plans against the 2022 NYC Building Code. The platform analyzes 113 highly formatted PDF chapters and appendices to deliver accurate, localized compliance evaluations.

## 2. Problem Statement
Architects, engineers, and builders in New York City spend an exorbitant amount of time manually searching, cross-referencing, and verifying compliance against massive, densly-formatted local regulation PDFs (like the 2022 NYC Building Code). Incorrect assumptions lead to failed inspections, redesigns, and costly construction delays. 

## 3. Product Vision & Goals
**Vision:** To provide a single-source-of-truth compliance checking utility that instantly and accurately verifies building queries against the exact textual and tabular data of the latest NYC Building Codes.
**Goals for MVP:**
- Achieve 100% extraction accuracy on 113 NYC Building Code PDFs, without skipping heavily formatted appendices.
- Maintain a highly cost-efficient ingestion pipeline by running vector embeddings locally.
- Leverage high-speed LLM inference to provide real-time code compliance feedback. 

## 4. Target Audience
- **Architects & Draftspersons:** Verifying design compliance during the drafting phase.
- **Structural/MEP Engineers:** Checking specific engineering mandates against NYC amendments.
- **Contractors & Project Managers:** Validating material and construction constraints on-site.
- **Expediters:** Speeding up the permit review process.

## 5. Key User Stories
- **As an Architect**, I want to ask detailed questions about fire district safety (e.g., Appendix D) so that I can ensure my design won't be rejected by the Department of Buildings.
- **As a Developer**, I want the system to parse both standard text and complex tables flawlessly, so that no critical edge-case rules are dropped from the context window.
- **As a System Admin**, I want to update the Pinecone vector database automatically when new NYC code addendums are released, using a reliable script that prevents 0-length chunk errors.

## 6. Functional Requirements

### 6.1. Document Ingestion Pipeline
*   **Source Material:** 113 Official 2022 NYC Building Code PDFs.
*   **Parsing Mechanism:** Must utilize `pdfjs-dist` inside structural loaders to ensure accurate text extraction, heavily targeting deeply nested layout structures without losing data (No skipped documents).
*   **Chunking Strategy:** Chunk documents intelligently to capture full semantic regulatory clauses. Must combine parsed items separated by spaces to maintain contiguous rule definitions. 

### 6.2. Vector Embeddings & Storage
*   **Local Embeddings:** Use local HuggingFace Transformers (`Xenova/all-MiniLM-L6-v2`) to generate vector representations of the text, avoiding external API token costs for the ingestion of millions of tokens.
*   **Vector Database:** Integration with Pinecone (Index: `nyc-code-compliance`) for ultra-fast, scalable Nearest-Neighbor similarity search.

### 6.3. AI Compliance Engine (RAG)
*   **Inference Model:** Utilize Groq API (`llama-3.1-8b-instant`) for blazing-fast inference.
*   **Context Fetching:** Before generation, the system will perform similarity searches in Pinecone to retrieve the exact pages and paragraphs of the NYC Code related to the query.
*   **Sourcing:** Responses must explicitly cite the chapter, appendix, and page number of the NYC Building Code to build user trust.

### 6.4. User Interface
*   **Frontend System:** Next.js application with Tailwind CSS styling.
*   **Interaction Model:** Chat-like interface where users can submit building scenarios or explicit code-lookup requests.
*   **Loading States:** Real-time generation streams or active loading indicators while the system parses the vector DB.

## 7. Non-Functional Requirements
*   **Accuracy over Creativity:** The LLM prompt temperature should be strictly low. It must *not* hallucinate building codes. If the RAG context does not hold the answer, the system must state that the code isn't explicitly found.
*   **Data Integrity:** The pipeline must strictly fault upon encountering an "empty" document chunking schema to prevent incomplete DB uploads. 
*   **Scalability:** The backend (Node.js / Express / TypeScript) must handle multiple concurrent query inferences asynchronously.

## 8. Technical Architecture
*   **Frontend:** React / Next.js / Tailwind CSS (`/frontend`).
*   **Backend:** Node.js (v25) / TypeScript (`/backend`).
*   **AI Framework:** `@langchain/community`, `@langchain/pinecone`.
*   **LLM Provider:** Groq (`groq-sdk`).
*   **Embedding Model:** `@xenova/transformers` (Local Node Execution).
*   **Database:** Pinecone Serverless.

## 9. Future Roadmap (v1.1+)
- **Image/Plan Parsing:** Allow users to upload architectural diagrams or DWG exports and run multimodal checks.
- **Version Control Code Toggling:** Switch between 2014 and 2022 NYC Building Codes.
- **Highlighting and Export:** Generate compliant marked-up PDF reports to attach directly to DOB submission forms.