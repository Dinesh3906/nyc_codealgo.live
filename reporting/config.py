from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8010
    API_HOST: str = "0.0.0.0"

    # Branding
    BRANDING_TITLE: str = "PermitIQ Automated Compliance Audit Report"
    BRANDING_FOOTER: str = "Confidential - PermitIQ Compliance Engines - Page {page}"
    COMPANY_NAME: str = "PermitIQ"

    # Color Codes (HEX)
    COLOR_PASS: str = "#2ebd59"
    COLOR_FAIL: str = "#e73c3c"
    COLOR_WARNING: str = "#f1c40f"
    COLOR_REVIEW: str = "#34495e"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
