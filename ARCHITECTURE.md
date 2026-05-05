# NYC House Code Architecture Documentation

## Overview
NYC House Code is an AI-powered system designed to automate the NYC Building Code compliance analysis process. It leverages Retrieval-Augmented Generation (RAG) to compare architectural plans against 113 specialized NYC Building Code documents.

## System Components

### 1. Frontend (Next.js 14)
- **Framework**: Next.js with App Router and TypeScript.
- **Styling**: TailwindCSS for responsive and modern UI.
- **State Management**: Zustand for client-side state handling.
- **Real-time Communication**: Socket.io-client for live processing updates.
- **PDF Handling**: jsPDF for generating downloadable compliance reports.

### 2. Backend (Node.js + Express)
- **API Engine**: Express server written in TypeScript.
- **Database**: MySQL for structured data (Users, Plans, Analysis Results).
- **Authentication**: JWT-based secure authentication.
- **Real-time Communication**: Socket.io server for plan processing status.

### 3. AI RAG Pipeline
- **Vector Database**: Pinecone (Free Tier) stores vector embeddings of NYC Building Code documents.
- **Embeddings**: `@xenova/transformers` (all-MiniLM-L6-v2) generates embeddings locally on the server to keep costs zero.
- **LLM Engine**: Groq API (LLama-3-70b/80b models) for high-performance, low-latency code analysis.
- **Data Ingestion**: A dedicated script (`langchain_ingest.ts`) chunks 113 NYC Building Code PDFs and populates the vector store.

### 4. Billing & Subscriptions
- **Gateway**: Stripe integration for handling plan-based access.
- **Model**: Credit-based or subscription-based usage tracking managed via middleware.

## Data Flow

1. **Upload**: The user uploads a plan PDF through the frontend.
2. **Preprocessing**: The backend extracts text/data from the uploaded file.
3. **Retrieval**: The system generates an embedding of the plan's content and queries Pinecone for the most relevant sections of the NYC Building Code.
4. **Generation**: The retrieved context and the plan data are sent to the Groq LLM with a specialized prompt.
5. **Report**: The LLM returns a structured JSON result, which is saved to the database and sent back to the user via WebSockets.

## Development Workflow

- **Branching Strategy**: Use feature branches (like the `blue` branch) for development and merge into `main` via Pull Requests.
- **Migrations**: Database schema changes are tracked in `backend/migrations`.
- **Environment Variables**: Configure `.env` for backend and `.env.local` for frontend.

---
*For more details, refer to the [README.md](./README.md).*
