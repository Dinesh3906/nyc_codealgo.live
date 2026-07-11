from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8012
    API_HOST: str = "0.0.0.0"

    # AIOps Alarm Thresholds
    DRIFT_THRESHOLD_COSINE: float = 0.88
    EVALUATION_FREQUENCY_DAYS: int = 1
    
    # Storage registries paths
    MODEL_REGISTRY_PATH: str = "./model_registry_state.json"
    PROMPT_REGISTRY_PATH: str = "./prompt_registry_state.json"
    FEEDBACK_STORE_PATH: str = "./feedback_registry_state.json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
