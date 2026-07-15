from sqlalchemy import create_engine, Column, String, Boolean, DateTime, JSON, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
from ..config import settings

db_url = settings.DATABASE_URL
if settings.APP_ENV.lower() == "production" and db_url.startswith("sqlite"):
    raise RuntimeError("SQLite DATABASE_URL is not allowed when APP_ENV=production.")

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Entities
class UserDB(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Engineer")
    disabled = Column(Boolean, default=False)

class JobDB(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    status = Column(String, default="pending") # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    result = Column(JSON, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
