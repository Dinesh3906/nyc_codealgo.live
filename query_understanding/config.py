from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8005
    API_HOST: str = "0.0.0.0"

    # Search Defaults
    DEFAULT_JURISDICTION: str = "NYC"
    DEFAULT_REVISION_YEAR: str = "2022"
    DEFAULT_SEARCH_TOPK: int = 5
    MIN_INTENT_CONFIDENCE: float = 0.65

    # Target Search Costs (Virtual Metrics)
    SEMANTIC_SEARCH_COST: float = 0.05
    LEXICAL_SEARCH_COST: float = 0.01
    HYBRID_SEARCH_COST: float = 0.06

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
