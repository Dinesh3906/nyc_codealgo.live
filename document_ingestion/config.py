import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from enum import Enum

class OCREngineType(str, Enum):
    AZURE = "azure"
    GOOGLE = "google"

class Settings(BaseSettings):
    # Runtime Environment
    APP_ENV: str = "production"

    # API Settings
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"

    # PDF Processing Settings
    DPI: int = 300
    PARALLEL_WORKERS: int = 4
    MAX_PAGES: int = 300
    MAX_FILE_SIZE_MB: int = 100
    TIMEOUT_SECONDS: int = 180

    # OCR Settings
    OCR_ENGINE: OCREngineType = OCREngineType.AZURE
    AZURE_OCR_ENDPOINT: str = ""
    AZURE_OCR_KEY: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # Pipeline Settings
    RETRY_COUNT: int = 3
    RETRY_BACKOFF_SECONDS: float = 2.0

    # Image Processing Defaults
    DESKEW_MAX_ANGLE: float = 10.0
    CONTRAST_LIMIT: float = 2.0
    GRID_SIZE: int = 8

    # Path to store temp uploads if needed
    TEMP_DIR: str = "temp_uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate settings
settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.TEMP_DIR, exist_ok=True)
