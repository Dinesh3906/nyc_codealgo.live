from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Gateway
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"

    # Database URLs
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/permit_iq"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security JWT keys
    JWT_SECRET: str = "permit-iq-super-secure-key-123456"
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

settings = Settings()
