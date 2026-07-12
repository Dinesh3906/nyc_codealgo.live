from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


WEAK_JWT_SECRETS = {
    "",
    "secret",
    "permit-iq-super-secure-key-123456",
    "nyc_house_code_secret_v1_2024",
}

class Settings(BaseSettings):
    # API Gateway
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"

    # Database URLs
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/permit_iq"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security JWT keys
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Storage Settings (local / s3)
    STORAGE_PROVIDER: str = "local"
    S3_BUCKET_NAME: str = "permit-iq-documents"
    LOCAL_STORAGE_DIR: str = "./storage_uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def require_jwt_secret(self) -> str:
        if not self.JWT_SECRET or self.JWT_SECRET in WEAK_JWT_SECRETS or len(self.JWT_SECRET) < 32:
            raise RuntimeError("JWT_SECRET must be supplied from environment and be at least 32 characters.")
        return self.JWT_SECRET

settings = Settings()
