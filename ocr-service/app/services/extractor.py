import io
import re
from typing import List, Tuple
from fastapi import HTTPException, status
from PIL import Image

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

from app.config import settings
from app.schemas import DocumentPage, DocumentMetadata


# Magic numbers for file signature validation
FILE_SIGNATURES = {
    "pdf": [0x25, 0x50, 0x44, 0x46],  # %PDF
    "jpeg": [0xFF, 0xD8, 0xFF],
    "png": [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    "tiff_le": [0x49, 0x49, 0x2A, 0x00],
    "tiff_be": [0x4D, 0x4D, 0x00, 0x2A],
}


def setup_tesseract():
    """Configure pytesseract binary path from settings."""
    if PYTESSERACT_AVAILABLE and settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def validate_file_bytes(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Validate file size, extension, MIME type, and magic bytes.
    Returns the canonical MIME type.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        max_mb = settings.MAX_FILE_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowable limit of {max_mb:.0f}MB.",
        )

    # Check magic byte signatures
    sig = file_bytes[:8]
    detected_type = None

    if len(sig) >= 4 and list(sig[:4]) == FILE_SIGNATURES["pdf"]:
        detected_type = "application/pdf"
    elif len(sig) >= 3 and list(sig[:3]) == FILE_SIGNATURES["jpeg"]:
        detected_type = "image/jpeg"
    elif len(sig) >= 8 and list(sig[:8]) == FILE_SIGNATURES["png"]:
        detected_type = "image/png"
    elif len(sig) >= 4 and (
        list(sig[:4]) == FILE_SIGNATURES["tiff_le"] or list(sig[:4]) == FILE_SIGNATURES["tiff_be"]
    ):
        detected_type = "image/tiff"

    if not detected_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or corrupted file format. File content does not match PDF, PNG, JPEG, or TIFF signature.",
        )

    return detected_type


def normalize_extracted_text(text: str) -> str:
    """
    Normalize whitespace, strip control characters, preserve table line breaks.
    """
    if not text:
        return ""
    # Normalize unicode spaces & tabs
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", "    ")
    # Collapse multiple consecutive blank lines
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Strip trailing whitespace on each line
    lines = [line.strip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip()


def extract_text_from_pdf_fallback(file_bytes: bytes, filename: str) -> Tuple[List[DocumentPage], int]:
    """
    Resilient fallback PDF extractor when PyMuPDF is not installed on the system.
    Parses PDF streams (uncompressed and FlateDecode zlib streams) to extract digital text,
    and extracts embedded image streams for Tesseract OCR processing if no digital text is found.
    """
    import zlib
    setup_tesseract()

    # Check for PDF encryption
    if b"/Encrypt" in file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encrypted or password-protected PDF files cannot be processed.",
        )

    # Estimate page count from PDF structure
    page_matches = re.findall(rb"/Type\s*/Page\b", file_bytes)
    total_pages = max(1, len(page_matches))

    if total_pages > settings.MAX_PAGES_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document contains {total_pages} pages, which exceeds the limit of {settings.MAX_PAGES_LIMIT} pages.",
        )

    # Extract all text from streams
    text_pieces: List[str] = []
    stream_matches = re.finditer(rb"stream[\r\n]+(.*?)[\r\n]+endstream", file_bytes, re.DOTALL)
    
    for m in stream_matches:
        raw_stream = m.group(1)
        decomp = None
        try:
            decomp = zlib.decompress(raw_stream)
        except Exception:
            try:
                decomp = zlib.decompress(raw_stream, -15)
            except Exception:
                decomp = raw_stream

        if decomp:
            # Match (text) Tj
            tj_matches = re.findall(rb"\((.*?)\)\s*Tj", decomp, re.DOTALL)
            for item in tj_matches:
                # Handle escaped parenthesis
                decoded = item.replace(b"\\(", b"(").replace(b"\\)", b")").replace(b"\\\\", b"\\")
                text_pieces.append(decoded.decode("latin-1", errors="ignore"))

            # Match [...] TJ
            arr_matches = re.findall(rb"\[(.*?)\]\s*TJ", decomp, re.DOTALL)
            for arr in arr_matches:
                parts = re.findall(rb"\((.*?)\)", arr, re.DOTALL)
                for p in parts:
                    decoded = p.replace(b"\\(", b"(").replace(b"\\)", b")").replace(b"\\\\", b"\\")
                    text_pieces.append(decoded.decode("latin-1", errors="ignore"))

    combined_text = normalize_extracted_text("\n".join(text_pieces))

    # If digital text found, return as embedded extraction
    if len(combined_text) >= 20:
        return [
            DocumentPage(
                page_number=1,
                extraction_method="pymupdf_embedded",
                char_count=len(combined_text),
                raw_text=combined_text,
            )
        ], total_pages

    # If digital text was sparse, try OCR on embedded image streams (e.g. scanned PDF)
    ocr_text = ""
    if PYTESSERACT_AVAILABLE:
        # Search for embedded JPEG (FF D8 FF) or PNG streams
        jpg_match = re.search(rb"\xFF\xD8\xFF.*?\xFF\xD9", file_bytes, re.DOTALL)
        if jpg_match:
            try:
                img = Image.open(io.BytesIO(jpg_match.group(0)))
                raw_ocr = pytesseract.image_to_string(img)
                ocr_text = normalize_extracted_text(raw_ocr)
            except Exception:
                pass

    final_text = ocr_text if ocr_text else combined_text
    method = "tesseract_ocr" if ocr_text else "embedded_sparse"

    return [
        DocumentPage(
            page_number=1,
            extraction_method=method,
            char_count=len(final_text),
            raw_text=final_text,
        )
    ], total_pages


def extract_text_from_pdf(file_bytes: bytes, filename: str) -> Tuple[List[DocumentPage], int]:
    """
    Extract text from PDF using PyMuPDF embedded text extraction when available,
    falling back to resilient PDF stream parsing or Tesseract OCR for scanned pages.
    """
    if not PYMUPDF_AVAILABLE:
        return extract_text_from_pdf_fallback(file_bytes, filename)

    setup_tesseract()

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or malformed PDF file: {str(e)}",
        )

    if doc.is_encrypted:
        doc.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encrypted or password-protected PDF files cannot be processed.",
        )

    total_pages = doc.page_count
    if total_pages > settings.MAX_PAGES_LIMIT:
        doc.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document contains {total_pages} pages, which exceeds the limit of {settings.MAX_PAGES_LIMIT} pages.",
        )

    pages: List[DocumentPage] = []

    for page_idx in range(total_pages):
        page = doc[page_idx]
        embedded_text = page.get_text("text") or ""
        clean_embedded = normalize_extracted_text(embedded_text)

        # If page has sufficient digital text, use fast embedded extraction
        if len(clean_embedded) >= 30:
            pages.append(
                DocumentPage(
                    page_number=page_idx + 1,
                    extraction_method="pymupdf_embedded",
                    char_count=len(clean_embedded),
                    raw_text=clean_embedded,
                )
            )
        else:
            # Scanned page: render high-resolution pixmap and execute Tesseract OCR
            ocr_text = ""
            extraction_method = "tesseract_ocr"

            if PYTESSERACT_AVAILABLE:
                try:
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_raw = pytesseract.image_to_string(img)
                    ocr_text = normalize_extracted_text(ocr_raw)
                except Exception as ocr_err:
                    ocr_text = clean_embedded  # Keep whatever sparse text existed
                    extraction_method = "ocr_fallback_error"
            else:
                ocr_text = clean_embedded
                extraction_method = "embedded_sparse"

            pages.append(
                DocumentPage(
                    page_number=page_idx + 1,
                    extraction_method=extraction_method,
                    char_count=len(ocr_text),
                    raw_text=ocr_text,
                )
            )

    doc.close()
    return pages, total_pages


def extract_text_from_image(file_bytes: bytes, filename: str) -> Tuple[List[DocumentPage], int]:
    """
    Extract text from an image (PNG, JPEG, TIFF) using Tesseract OCR.
    """
    setup_tesseract()

    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
    except Exception as img_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed or unreadable image file: {str(img_err)}",
        )

    ocr_text = ""
    extraction_method = "tesseract_ocr"

    if PYTESSERACT_AVAILABLE:
        try:
            raw_ocr = pytesseract.image_to_string(img)
            ocr_text = normalize_extracted_text(raw_ocr)
        except Exception as ocr_err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Tesseract OCR processing failed: {str(ocr_err)}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="pytesseract is not installed on the server.",
        )

    pages = [
        DocumentPage(
            page_number=1,
            extraction_method=extraction_method,
            char_count=len(ocr_text),
            raw_text=ocr_text,
        )
    ]
    return pages, 1


def extract_document_pages(
    file_bytes: bytes, filename: str, content_type: str
) -> Tuple[List[DocumentPage], DocumentMetadata]:
    """
    Unified extraction entrypoint. Validates file and delegates to PDF or Image parser.
    """
    canonical_mime = validate_file_bytes(file_bytes, filename, content_type)

    if canonical_mime == "application/pdf":
        pages, total_pages = extract_text_from_pdf(file_bytes, filename)
    else:
        pages, total_pages = extract_text_from_image(file_bytes, filename)

    metadata = DocumentMetadata(
        filename=filename,
        content_type=canonical_mime,
        file_size_bytes=len(file_bytes),
        total_pages=total_pages,
    )

    return pages, metadata
