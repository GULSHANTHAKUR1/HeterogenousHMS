from datetime import datetime
from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
def get_health():
    return {
        "success": True,
        "service": "Heterogeneous HMS Python OCR & NLP Microservice",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "tesseract_configured_path": settings.TESSERACT_CMD,
        "spacy_model": settings.SPACY_MODEL,
    }
