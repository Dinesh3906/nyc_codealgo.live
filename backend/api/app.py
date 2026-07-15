from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from shared.cors import configure_cors
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
import datetime
from ..config import settings
from ..schemas.models import UserRegister, UserResponse, Token, JobResponse, TokenData
from ..database.connection import get_db, UserDB, JobDB
from ..security.auth import get_password_hash, verify_password, create_access_token, get_current_user, RoleChecker
from ..storage.provider import StorageProvider
from ..workers.tasks import process_compliance_job

app = FastAPI(
    title="PermitIQ Enterprise Core Backend API",
    description="Orchestrates OAuth2 SSO, JWT auth, PDF storage, and Celery job distribution",
    version="1.0.0"
)

configure_cors(app)

storage = StorageProvider()

@app.post("/auth/register", response_model=UserResponse, summary="Register user")
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = get_password_hash(user.password)
    new_user = UserDB(
        id=str(uuid.uuid4()),
        email=user.email,
        hashed_password=hashed,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=Token, summary="Login oauth2 token")
def login_for_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/jobs/upload", response_model=JobResponse, summary="Upload PDF and trigger compliance audit")
def upload_compliance_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: TokenData = Depends(RoleChecker(["Admin", "Reviewer", "Engineer"]))
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF allowed.")

    # Save file
    stored_path = storage.save_file(file.filename, file.file)

    # Register job entry
    job_id = str(uuid.uuid4())
    new_job = JobDB(
        id=job_id,
        filename=file.filename,
        status="pending",
        progress=0.0
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Trigger celery task asynchronously
    process_compliance_job.delay(job_id, stored_path)

    return JobResponse(
        job_id=new_job.id,
        filename=new_job.filename,
        status=new_job.status,
        progress=new_job.progress,
        created_at=new_job.created_at
    )

@app.get("/jobs/{job_id}/status", response_model=JobResponse, summary="Check job status")
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    user: TokenData = Depends(get_current_user)
):
    job = db.query(JobDB).filter(JobDB.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        job_id=job.id,
        filename=job.filename,
        status=job.status,
        progress=job.progress,
        created_at=job.created_at,
        result=job.result
    )

@app.get("/health", summary="Health check")
def health_check():
    return {
        "status": "healthy",
        "api_gateway": "FastAPI",
        "database": "SQLite/Postgres",
        "workers": "Celery ready"
    }

@app.get("/metrics", summary="Prometheus Metrics Instrumentation")
def get_prometheus_metrics(db: Session = Depends(get_db)):
    job_counts = dict(
        db.query(JobDB.status, func.count(JobDB.id))
        .group_by(JobDB.status)
        .all()
    )
    user_count = db.query(func.count(UserDB.id)).scalar() or 0

    metrics = (
        "# HELP permitiq_users_total Total registered users\n"
        "# TYPE permitiq_users_total gauge\n"
        f"permitiq_users_total {user_count}\n"
        "# HELP permitiq_jobs_total Total compliance jobs by status\n"
        "# TYPE permitiq_jobs_total gauge\n"
        + "".join(
            f'permitiq_jobs_total{{status="{status}"}} {count}\n'
            for status, count in sorted(job_counts.items())
        )
    )
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=metrics)
