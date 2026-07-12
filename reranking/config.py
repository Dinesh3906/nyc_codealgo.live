from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8007
    API_HOST: str = "0.0.0.0"

    # Neural Reranking Config
    TARGET_EVIDENCE_SIZE: int = 10
    USE_GPU: bool = False
    GPU_DEVICE: str = "cuda:0"
    COLBERT_MODEL_NAME: str = ""

    # Scoring Weights (Must sum to 1.0)
    COLBERT_WEIGHT: float = 0.60
    RRF_WEIGHT: float = 0.30
    METADATA_WEIGHT: float = 0.10

    # Diversity Penalty Values
    DIVERSITY_SECTION_PENALTY: float = 0.20
    DIVERSITY_PAGE_PENALTY: float = 0.10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
