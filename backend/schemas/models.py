from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str = "Engineer" # Viewer, Engineer, Reviewer, Admin

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    disabled: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    filename: str
    status: str # pending, processing, completed, failed
    progress: float = 0.0
    created_at: datetime
    result: Optional[Dict[str, Any]] = None
