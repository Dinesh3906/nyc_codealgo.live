from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8002
    API_HOST: str = "0.0.0.0"

    # Match thresholds
    MATCH_IOU_THRESHOLD: float = 0.45
    TEXT_ASSOCIATION_DISTANCE_LIMIT_PTS: float = 60.0
    CONFIDENCE_THRESHOLD: float = 0.70
    ROOM_GAP_TOLERANCE_PTS: float = 3.0

    # Dynamic symbol classifier parameters
    SYMBOL_MIN_CONFIDENCE: float = 0.75

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
