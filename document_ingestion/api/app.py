import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from ..config import settings
from ..normalization.engine import NormalizationEngine
from ..models import Document

app = FastAPI(
    title="PermitIQ Ingestion API",
    description="Intelligent PDF Ingestion and Document Normalization Engine",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate engine once on startup
normalization_engine = NormalizationEngine()

def cleanup_temp_file(file_path: str):
    """Removes temporary uploaded file from disk."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

@app.post("/ingest", response_model=Document, summary="Ingest and normalize architectural PDF")
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Uploads an engineering document in PDF format, dynamically detects its type,
    performs vector/raster extraction and OCR, and returns a Unified Document Representation.
    """
    # 1. Basic Validation
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # 2. Write Uploaded Stream to Temp File
    temp_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(settings.TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    # Schedule file cleanup to run after response finishes transmitting
    background_tasks.add_task(cleanup_temp_file, temp_path)

    # 3. Process & Normalize Document
    try:
        document_representation = normalization_engine.process_document(
            temp_path, 
            file.filename
        )
        return document_representation
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document parsing failed: {str(e)}")

@app.get("/health", summary="Health check endpoint")
async def health_check():
    """Returns the operational status of the service."""
    return {
        "status": "healthy",
        "ocr_engine": settings.OCR_ENGINE,
        "max_pages": settings.MAX_PAGES,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB
    }
