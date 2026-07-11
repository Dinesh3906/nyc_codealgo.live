import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8001
    API_HOST: str = "0.0.0.0"

    # Layout Analysis Defaults
    # Sizing ratios relative to sheet dimensions
    TITLE_BLOCK_RIGHT_WIDTH_RATIO: float = 0.22  # Right-side title blocks width (e.g. 22% of page width)
    TITLE_BLOCK_BOTTOM_HEIGHT_RATIO: float = 0.18 # Bottom-side title blocks height (e.g. 18% of page height)
    GENERAL_NOTES_WIDTH_RATIO: float = 0.30       # Typically right/left 30% of page if notes are listed
    
    # Table Extraction tolerances
    TABLE_ROW_GAP_TOLERANCE_PTS: float = 6.0      # Grouping text into rows (points)
    TABLE_COL_GAP_TOLERANCE_PTS: float = 12.0     # Grouping text into columns (points)

    # Classification parameters
    MIN_CLASSIFICATION_CONFIDENCE: float = 0.65
    
    # Parallel worker settings
    PARALLEL_WORKERS: int = 4

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
