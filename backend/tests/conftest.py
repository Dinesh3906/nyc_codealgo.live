import pytest
import os
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-value-at-least-32-characters-long")

from backend.api.app import app
from backend.database.connection import get_db, Base, engine, SessionLocal

# Recreate test tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

@pytest.fixture
def db_session():
    """Generates clean db session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client():
    """Generates FastAPI TestClient."""
    return TestClient(app)
