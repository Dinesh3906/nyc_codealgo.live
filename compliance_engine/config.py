from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8009
    API_HOST: str = "0.0.0.0"

    # Deterministic Rule Limits
    MIN_DOOR_WIDTH_INCHES: float = 32.0
    MIN_WC_TURNING_RADIUS_INCHES: float = 60.0
    MAX_RAMP_SLOPE_PERCENT: float = 8.33
    MIN_STAIR_WIDTH_INCHES: float = 44.0
    MIN_STAIR_WIDTH_EXCEPTION_LOAD: int = 50
    MIN_STAIR_WIDTH_EXCEPTION_INCHES: float = 36.0

    # Decision Confidence Boundaries
    CONFIDENCE_PASS_THRESHOLD: float = 0.70
    CONFIDENCE_HUMAN_REVIEW_THRESHOLD: float = 0.60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
