from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8004
    API_HOST: str = "0.0.0.0"

    # Occupant Load Factors (sq ft per person)
    # Default mappings matching NYC Building Code Chapter 10 Table 1004.1.2
    OCCUPANT_LOAD_FACTORS: Dict[str, float] = {
        "assembly_unconcentrated": 15.0,
        "assembly_concentrated": 7.0,
        "business": 100.0,
        "educational_classroom": 20.0,
        "mercantile": 60.0,
        "residential": 200.0,
        "storage": 300.0,
        "default": 100.0
    }

    # Egress Width Factors (inches per occupant)
    EGRESS_STAIR_WIDTH_FACTOR: float = 0.3
    EGRESS_LEVEL_WIDTH_FACTOR: float = 0.2

    # Accessibility Clearance thresholds (inches)
    ACCESSIBILITY_TURNING_RADIUS_INCHES: float = 60.0
    ACCESSIBILITY_DOOR_CLEARANCE_INCHES: float = 32.0
    ACCESSIBILITY_MAX_RAMP_SLOPE_PCT: float = 8.33

    # Default scale conversion (Points to Inches)
    # 72 points = 1 inch
    PT_TO_INCH_SCALE: float = 1.0 / 72.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
