from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Dict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8013
    API_HOST: str = "0.0.0.0"

    # Monitor check intervals
    CHECK_INTERVAL_SECONDS: int = 86400
    
    # Official Source targets
    SOURCES_REGISTRY: List[Dict[str, str]] = [
        {"name": "NYC DOB", "url": "https://www.nyc.gov/site/buildings/index.page"},
        {"name": "ICC", "url": "https://codes.iccsafe.org"},
        {"name": "NFPA", "url": "https://www.nfpa.org"}
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
