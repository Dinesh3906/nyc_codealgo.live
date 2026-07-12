from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8003
    API_HOST: str = "0.0.0.0"

    # Spatial Reasoning parameters
    GROUNDING_DISTANCE_LIMIT_PTS: float = 40.0
    WALL_TOUCH_TOLERANCE_PTS: float = 6.0
    MIN_RELATIONSHIP_CONFIDENCE: float = 0.70

    # Path analysis weights
    DOOR_TRANSITION_COST_PTS: float = 10.0 # Virtual distance penalty for opening a door

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
