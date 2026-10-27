import os
import subprocess
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from app.config import settings
from app.security import verify_internal_service_key
from app.schemas import (
    ReportAnalysisResponse,
    ProcessingStatusResponse,
)
from app.services.extractor import (
    extract_document_pages,
    PYMUPDF_AVAILABLE,
    PYTESSERACT_AVAILABLE,
)
from app.services.parser import parse_document_pages

router = APIRouter(prefix="/ocr", tags=["OCR & NLP Engine"])


@router.get("/status", response_model=ProcessingStatusResponse)
def check_ocr_status(authorized: bool = Depends(verify_internal_service_key)):
    """
    Check microservice operational readiness and verify installed dependencies.
    """
    tesseract_version = None
    tesseract_ok = False

    if os.path.exists(settings.TESSERACT_CMD):
        try:
            out = subprocess.check_output(
                [settings.TESSERACT_CMD, "--version"],
                stderr=subprocess.STDOUT,
                text=True,
                timeout=5,
            )
            first_line = out.strip().split("\n")[0]
            tesseract_version = first_line
            tesseract_ok = True
        except Exception as e:
            tesseract_version = f"Error querying binary: {str(e)}"
    else:
        tesseract_version = f"Executable not found at configured path: {settings.TESSERACT_CMD}"

    try:
        import spacy
        spacy_ok = True
        spacy_version = spacy.__version__
    except ImportError:
        spacy_ok = False
        spacy_version = None

    return ProcessingStatusResponse(
        status="online",
        service="Heterogeneous HMS - OCR & NLP Microservice",
        tesseract_available=tesseract_ok,
        tesseract_version=tesseract_version,
        spacy_available=spacy_ok,
        spacy_model=settings.SPACY_MODEL if spacy_ok else None,
        pymupdf_available=PYMUPDF_AVAILABLE,
    )


@router.post(
    "/process-report",
    response_model=ReportAnalysisResponse,
    dependencies=[Depends(verify_internal_service_key)],
)
async def process_report(file: UploadFile = File(...)):
    """
    Primary document analysis endpoint for trusted HMS Express backend.
    Processes digital and scanned medical PDF/Images:
    1. Validates file size, MIME type, and magic bytes.
    2. Extracts digital text via PyMuPDF or scanned pages via Tesseract OCR.
    3. Executes rule-based medical extraction preserving precision and laboratory reference ranges.
    4. Generates candidate clinical findings marked for physician review.
    5. Returns structured JSON with provenance tracking.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload payload.",
        )

    # Read binary stream
    try:
        file_bytes = await file.read()
    except Exception as read_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file payload: {str(read_err)}",
        )

    # 1 & 2: Extract text per page
    pages, metadata = extract_document_pages(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
    )

    # 3 & 4: Parse clinical parameters and narrative findings
    extracted_params, clinical_findings, detected_date = parse_document_pages(pages)

    if detected_date:
        metadata.report_date = detected_date

    # Determine report type if detected from findings
    if any("cbc" in p.test_name.lower() or "hemoglobin" in p.test_name.lower() for p in extracted_params):
        metadata.detected_report_type = "Complete Blood Count (CBC)"
    elif any("glucose" in p.test_name.lower() or "cholesterol" in p.test_name.lower() for p in extracted_params):
        metadata.detected_report_type = "Biochemistry / Lipid Panel"
    elif any("chest" in f.lower() or "lung" in f.lower() for f in clinical_findings):
        metadata.detected_report_type = "Radiology / Chest X-Ray"

    return ReportAnalysisResponse(
        success=True,
        document_metadata=metadata,
        extracted_parameters=extracted_params,
        clinical_findings=clinical_findings,
        pages=pages,
        summary_message=f"Document analyzed successfully. {len(extracted_params)} clinical parameters identified for physician review.",
    )
