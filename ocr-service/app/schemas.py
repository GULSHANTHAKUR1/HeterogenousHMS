from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractedParameter(BaseModel):
    """
    Structured extraction item for a single medical laboratory or diagnostic parameter.
    Preserves original wording, numerical precision, and exact laboratory reference ranges.
    """
    test_name: str = Field(..., description="Canonical or extracted test name (e.g. Hemoglobin, Platelets)")
    value: str = Field(..., description="Exact observed test value preserving original precision (e.g. 8.5)")
    unit: Optional[str] = Field(None, description="Exact unit of measurement without silent conversion (e.g. g/dL)")
    reference_range: Optional[str] = Field(
        None, description="Explicit reference range stated by the testing laboratory (e.g. 13.0 - 17.0)"
    )
    abnormality_flag: Optional[str] = Field(
        None, description="Candidate abnormality flag (Normal, Low, High, Abnormal) for clinician review"
    )
    source_page: int = Field(1, description="1-indexed source document page where the parameter was located")
    source_line: Optional[str] = Field(None, description="Raw source line text for reviewer provenance verification")
    extraction_method: str = Field(
        ..., description="Extraction technique: 'pymupdf_embedded' or 'tesseract_ocr'"
    )
    confidence: Optional[float] = Field(
        None, description="Confidence score (0.0 to 1.0) only when meaningfully measurable"
    )
    review_status: str = Field(
        "PENDING_CLINICIAN_REVIEW",
        description="Review state: Candidate for physician review, never a final automated diagnosis"
    )


class DocumentPage(BaseModel):
    """
    Per-page extracted text with extraction provenance.
    """
    page_number: int
    extraction_method: str
    char_count: int
    raw_text: str


class DocumentMetadata(BaseModel):
    """
    Source document technical metadata.
    """
    filename: str
    content_type: str
    file_size_bytes: int
    total_pages: int
    detected_report_type: Optional[str] = None
    report_date: Optional[str] = None


class ReportAnalysisResponse(BaseModel):
    """
    Comprehensive structured response returned to the trusted Express backend.
    """
    success: bool = True
    document_metadata: DocumentMetadata
    extracted_parameters: List[ExtractedParameter]
    clinical_findings: List[str]
    pages: List[DocumentPage]
    summary_message: str


class ProcessingStatusResponse(BaseModel):
    """
    Service status check and capabilities report.
    """
    status: str
    service: str
    tesseract_available: bool
    tesseract_version: Optional[str] = None
    spacy_available: bool
    spacy_model: Optional[str] = None
    pymupdf_available: bool
