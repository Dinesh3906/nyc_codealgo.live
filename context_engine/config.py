from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict

class Settings(BaseSettings):
    # API Settings
    API_PORT: int = 8008
    API_HOST: str = "0.0.0.0"

    # Context Settings
    TOKEN_BUDGET: int = 8192
    DEFAULT_MODEL: str = "gemini-1.5-pro"

    # Prompt System Persona
    SYSTEM_PERSONA: str = (
        "You are PermitIQ, an expert AI compliance auditor specializing in international and local building codes. "
        "Your task is to analyze building facts against the retrieved regulations to verify compliance. "
        "Highlight any gaps or warnings clearly, citing exact sections and code books."
    )

    # Prompt Templates
    PROMPT_TEMPLATES: Dict[str, str] = {
        "compliance_review": (
            "## System Context\n{system_persona}\n\n"
            "## Building Facts\n{building_facts}\n\n"
            "## Retrieved Regulations\n{evidence_groups}\n\n"
            "## Citation Index\n{citations}\n\n"
            "## Instructions\n"
            "1. Evaluate the building facts against the retrieved regulations.\n"
            "2. Note any exceptions or definitions that apply.\n"
            "3. Identify any dimensional contradictions or conflicts in the rules.\n"
            "4. Output a structured compliance assessment in JSON format matching the schema."
        ),
        "code_explanation": (
            "## System Context\n{system_persona}\n\n"
            "## Retrieved Regulations\n{evidence_groups}\n\n"
            "## Instructions\n"
            "1. Explain the meaning and implications of the retrieved sections.\n"
            "2. Clarify how dimensions, clearances, or rules are calculated.\n"
            "3. Reference the exact citation indexes."
        )
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
