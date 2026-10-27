from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, ocr

app = FastAPI(
    title="Heterogeneous HMS - OCR & NLP Microservice",
    description="FastAPI service for PyMuPDF/Tesseract OCR document parsing and spaCy clinical entity extraction",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(health.router, prefix="/api/v1")
app.include_router(ocr.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {
        "service": "Heterogeneous HMS OCR & NLP Microservice",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/v1/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
