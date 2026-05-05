# NYC Code Analyzer (Brickly)

An AI-powered Retrieval-Augmented Generation (RAG) application designed to strictly validate architectural queries and building plans against the 2022 NYC Building Code.

## Project Vision
To provide a single-source-of-truth compliance checking utility that instantly and accurately verifies building queries against the exact textual and tabular data of the latest NYC Building Codes.

## Core Stack
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion, Zustand.
- **Backend**: Node.js v20+, TypeScript, Express, MySQL.
- **AI**: LangChain, Pinecone, Groq (Llama-3.1), Xenova Transformers (Local Embeddings).
- **Billing**: Stripe.

## Current Status
The project has a functional RAG pipeline but there are some discrepancies between the UI and the backend statuses, and the AI prompt logic can be improved by integrating the strict evaluation rules from the `ai.service.ts` into the main `native_rag.ts` pipeline.
