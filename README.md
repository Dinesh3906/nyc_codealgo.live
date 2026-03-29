# NYC Building Code Compliance Analyzer

AI-powered compliance checking system for NYC Department of Buildings (DOB) architectural plans using RAG (Retrieval-Augmented Generation).

## Features

- **RAG-Based Analysis**: Uses Pinecone vector database with 113 NYC Building Code PDFs
- **Local Embeddings**: Xenova/all-MiniLM-L6-v2 for cost-free embedding generation
- **Groq LLM**: Fast, free-tier LLM for compliance analysis
- **Structured Output**: Returns compliance score, summary, and detailed issues with recommendations
- **PDF Reports**: Download comprehensive compliance reports
- **Real-time Updates**: Socket.io for live analysis progress

## Tech Stack

### Backend
- Node.js + TypeScript + Express
- Pinecone (vector database)
- Groq API (LLM)
- @xenova/transformers (local embeddings)
- MySQL (data storage)
- Socket.io (real-time updates)
- pdfjs-dist (PDF text extraction)

### Frontend
- Next.js 14 + TypeScript
- TailwindCSS
- Framer Motion (animations)
- jsPDF (PDF generation)
- Zustand (state management)

## Setup

### Prerequisites
- Node.js 18+
- MySQL database
- Pinecone account (free tier)
- Groq API key (free tier)

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```env
PORT=5000
DATABASE_URL=mysql://user:password@localhost:3306/nyc_code
JWT_SECRET=your-secret-key
PINECONE_API_KEY=your-pinecone-key
GROQ_API_KEY=your-groq-key
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

3. Create Pinecone index:
```bash
npx tsx scripts/create_pinecone_index.ts
```

4. Ingest NYC Building Code PDFs:
```bash
npx tsx scripts/langchain_ingest.ts
```

5. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

3. Start development server:
```bash
npm run dev
```

## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── native_rag.ts          # RAG implementation
│   │   └── compliance.service.ts  # Analysis pipeline
│   ├── routes/
│   │   └── plans.routes.ts        # API endpoints
│   └── app.ts                     # Express app
├── scripts/
│   ├── create_pinecone_index.ts   # Index creation
│   └── langchain_ingest.ts        # PDF ingestion
└── pdfs/                          # NYC Building Code PDFs (113 files)

frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── page.tsx           # Dashboard overview
│   │       ├── plans/
│   │       │   ├── page.tsx       # Plans list
│   │       │   └── [id]/page.tsx  # Plan details
│   │       └── analyzer/page.tsx  # Analyzer page
│   └── components/
│       └── dashboard/
│           └── UploadPlanModal.tsx # Upload & analysis modal
```

## How It Works

1. **Upload**: User uploads architectural plan (PDF/image)
2. **Extract**: System extracts text from the plan
3. **Query**: Generate embedding and query Pinecone for relevant NYC code sections
4. **Analyze**: Groq LLM analyzes plan against retrieved code sections
5. **Report**: Return structured compliance report with:
   - Compliance percentage (0-100)
   - Executive summary
   - Detailed issues with severity levels
   - Specific code references
   - Recommendations for fixes

## API Endpoints

### Plans
- `POST /api/plans/upload` - Upload and analyze plan
- `GET /api/plans` - Get all user plans
- `GET /api/plans/:id` - Get specific plan
- `DELETE /api/plans/:id` - Delete plan

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

## Database Schema

```sql
CREATE TABLE user (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  fileName VARCHAR(255),
  fileUrl VARCHAR(255),
  status ENUM('processing', 'analyzed', 'failed'),
  analysisResult JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

## Analysis Result Format

```json
{
  "percentage": 80,
  "summary": "Brief 2-3 sentence overview",
  "issues": [
    {
      "title": "Issue name",
      "description": "What the violation is",
      "severity": "critical|major|minor",
      "rule": "NYC Building Code section",
      "suggestion": "How to fix it"
    }
  ]
}
```

## NYC Building Code Coverage

The system includes 113 PDF documents covering:
- Building Code (BC) - 57 documents
- Fuel Gas Code (FGC) - 15 documents
- Mechanical Code (MC) - 18 documents
- Plumbing Code (PC) - 18 documents
- General Administrative Provisions (GAP) - 5 documents

## Development

### Run Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact support@brickly.com
