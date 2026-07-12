from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8006
    API_HOST: str = "0.0.0.0"

    # Pinecone credentials
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = "us-east1-gcp"
    PINECONE_INDEX_NAME: str = "building-codes"
    ALLOW_MOCK_RETRIEVAL: bool = False

    # RRF Scoring Config
    RRF_CONSTANT_K: int = 60
    RRF_PINECONE_WEIGHT: float = 1.0
    RRF_BM25_WEIGHT: float = 1.0

    # Deduplication Jaccard Threshold (0.0 to 1.0)
    # Near-duplicates with text overlap > 80% are filtered
    DEDUP_JACCARD_THRESHOLD: float = 0.80

    # Retriever Timeouts and Retries
    RETRIEVER_TIMEOUT_MS: int = 1500
    RETRIEVER_RETRIES: int = 2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
