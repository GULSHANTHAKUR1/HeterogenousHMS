import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    TESSERACT_CMD: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    SPACY_MODEL: str = "en_core_web_sm"
    OCR_SERVICE_SECRET: str = "dev_internal_ocr_secret_2026"
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    MAX_PAGES_LIMIT: int = 10
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
