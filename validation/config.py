from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8011
    API_HOST: str = "0.0.0.0"

    # Baseline limits
    TARGET_PRECISION: float = 0.95
    TARGET_RECALL: float = 0.95
    TARGET_IOU: float = 0.85
    MAX_LATENCY_MS: float = 2500.0
    GOLDEN_DATASET_PATH: str = ""
    LOAD_TEST_RESULTS_PATH: str = ""
    CHAOS_DRILL_RESULTS_PATH: str = ""

    # MLOps active software versions
    ACTIVE_EMBEDDING_MODEL: str = "text-embedding-3-small-v1"
    ACTIVE_RERANKER_MODEL: str = "colbert-v2-maxsim-late-interaction"
    ACTIVE_GENERATOR_MODEL: str = "gemini-1.5-pro-002"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
