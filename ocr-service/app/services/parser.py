import re
from typing import List, Optional, Tuple
from app.schemas import DocumentPage, ExtractedParameter

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False


# Known clinical test canonical dictionary with aliases
COMMON_TEST_NAMES = [
    # Hematology
    "Hemoglobin", "Hb", "Total Leukocyte Count", "WBC", "White Blood Cells",
    "Platelet Count", "Platelets", "RBC", "Red Blood Cells", "Hematocrit", "PCV",
    "MCV", "MCH", "MCHC", "RDW", "Neutrophils", "Lymphocytes", "Eosinophils",
    "Monocytes", "Basophils", "ESR", "Erythrocyte Sedimentation Rate",
    # Biochemistry / Diabetes
    "Fasting Blood Glucose", "Blood Glucose", "Glucose", "Fasting Sugar", "PPBS",
    "HbA1c", "Glycated Hemoglobin", "Random Blood Sugar",
    # Renal / Kidney
    "Serum Creatinine", "Creatinine", "Blood Urea Nitrogen", "BUN", "Blood Urea", "Uric Acid",
    # Electrolytes
    "Serum Sodium", "Sodium", "Serum Potassium", "Potassium", "Chloride", "Calcium",
    # Lipid Profile
    "Total Cholesterol", "Cholesterol", "Triglycerides", "HDL Cholesterol", "HDL",
    "LDL Cholesterol", "LDL", "VLDL",
    # Liver Function
    "Total Bilirubin", "Direct Bilirubin", "SGOT", "AST", "SGPT", "ALT",
    "Alkaline Phosphatase", "ALP", "Total Protein", "Albumin", "Globulin",
    # Thyroid
    "TSH", "Free T3", "Free T4", "Total T3", "Total T4",
    # Urinalysis
    "Urine Protein", "Urine Glucose", "Urine Leucocytes", "Urine Pus Cells",
    # Radiology / General
    "Chest Radiograph", "Chest X-Ray", "Lung Fields", "Cardiothoracic Ratio",
]

# Standard medical units
UNITS_REGEX = r"(?:g/dL|mg/dL|mmol/L|µmol/L|umol/L|10\^3/uL|10\^3/µL|lakhs|cells/cu\.mm|cells/cumm|%|IU/L|U/L|mEq/L|ng/mL|µg/dL|ug/dL|/HPF|/hpf)"

# Abnormality keywords
ABNORMALITY_KEYWORDS = {
    "low": "Low",
    "l": "Low",
    "high": "High",
    "h": "High",
    "abnormal": "Abnormal",
    "abn": "Abnormal",
    "normal": "Normal",
    "norm": "Normal",
    "positive": "Positive",
    "negative": "Negative",
}

# Regex to extract report date if explicitly stated
DATE_PATTERNS = [
    r"(?:Date|Report Date|Collected|Dated)\s*[:\-]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})",
    r"(?:Date|Report Date|Collected|Dated)\s*[:\-]?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
    r"(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})",
]


def extract_report_date(text: str) -> Optional[str]:
    """Extract report date strictly from document text without inventing dates."""
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def parse_reference_range(range_str: str) -> Tuple[Optional[float], Optional[float]]:
    """Parse numeric min-max from a range string (e.g., '13.0 - 17.0' -> 13.0, 17.0)."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*[-–—to]\s*(\d+(?:\.\d+)?)", range_str)
    if match:
        try:
            return float(match.group(1)), float(match.group(2))
        except ValueError:
            pass
    return None, None


def determine_candidate_flag(
    value_str: str,
    range_str: Optional[str],
    explicit_flag: Optional[str]
) -> Optional[str]:
    """
    Determine candidate abnormality flag for physician review.
    Preserves laboratory-printed flag if present, or evaluates against explicit laboratory range.
    """
    if explicit_flag and explicit_flag in ["High", "Low", "Abnormal", "Normal"]:
        return explicit_flag

    if range_str:
        low, high = parse_reference_range(range_str)
        try:
            val = float(value_str)
            if low is not None and val < low:
                return "Low"
            if high is not None and val > high:
                return "High"
            if low is not None and high is not None and low <= val <= high:
                return "Normal"
        except ValueError:
            pass

    return explicit_flag or None


def parse_table_line(line: str, page_number: int, extraction_method: str) -> Optional[ExtractedParameter]:
    """
    Parse a single line of laboratory test text into an ExtractedParameter.
    Strict safety rules:
    - Does not invent missing values or ranges.
    - Preserves exact numerical precision and wording.
    - Captures source provenance.
    """
    clean_line = line.strip()
    if not clean_line or len(clean_line) < 4:
        return None

    # Check if line contains a known test name or alias
    matched_test = None
    for test_candidate in sorted(COMMON_TEST_NAMES, key=len, reverse=True):
        pattern = r"\b" + re.escape(test_candidate) + r"\b"
        if re.search(pattern, clean_line, re.IGNORECASE):
            matched_test = test_candidate
            break

    if not matched_test:
        return None

    # Extract remainder of the line after the test name
    match_pos = re.search(r"\b" + re.escape(matched_test) + r"\b", clean_line, re.IGNORECASE)
    if not match_pos:
        return None

    after_test = clean_line[match_pos.end():].strip()

    # Match numeric or qualitative value (e.g. 8.5, 140, Positive, Clear, Negative)
    val_match = re.search(r"(?:[:=-]\s*)?([><]?\s*\d+(?:\.\d+)?|Positive|Negative|Clear|Abnormal|Normal)\b", after_test, re.IGNORECASE)
    if not val_match:
        return None

    raw_value = val_match.group(1).replace(" ", "")
    after_val = after_test[val_match.end():].strip()

    # Match unit if present
    unit_match = re.search(UNITS_REGEX, after_val, re.IGNORECASE)
    unit = unit_match.group(0) if unit_match else None

    # Match reference range if explicitly stated on the line (e.g. 13.0 - 17.0, 4.0-11.0, < 100, Negative)
    range_match = re.search(
        r"[\(\[]?\s*(\d+(?:\.\d+)?\s*[-–—to]\s*\d+(?:\.\d+)?|[><]\s*\d+(?:\.\d+)?|Negative|Normal)\s*[\)\]]?",
        after_val,
        re.IGNORECASE
    )
    reference_range = range_match.group(1).strip() if range_match else None

    # Match explicit flag if printed on the line
    explicit_flag = None
    for token in re.split(r"[\s,;]+", after_val):
        cleaned_token = token.lower().strip("()[]*")
        if cleaned_token in ABNORMALITY_KEYWORDS:
            explicit_flag = ABNORMALITY_KEYWORDS[cleaned_token]
            break

    # Determine candidate abnormality flag
    candidate_flag = determine_candidate_flag(raw_value, reference_range, explicit_flag)

    return ExtractedParameter(
        test_name=matched_test,
        value=raw_value,
        unit=unit,
        reference_range=reference_range,
        abnormality_flag=candidate_flag,
        source_page=page_number,
        source_line=clean_line,
        extraction_method=extraction_method,
        confidence=0.95 if extraction_method == "pymupdf_embedded" else 0.85,
        review_status="PENDING_CLINICIAN_REVIEW",
    )


def extract_clinical_findings(text: str, extracted_params: List[ExtractedParameter]) -> List[str]:
    """
    Extract natural language clinical impressions and summary statements.
    Treats findings as candidate observations for physician review.
    """
    findings: List[str] = []

    # 1. Generate transparent observations from detected abnormalities
    for param in extracted_params:
        if param.abnormality_flag in ["Low", "High", "Abnormal"]:
            unit_str = f" {param.unit}" if param.unit else ""
            findings.append(f"{param.test_name} is {param.abnormality_flag.lower()} ({param.value}{unit_str})")

    # 2. Extract clinical narrative impressions from document text
    lines = text.split("\n")
    narrative_keywords = ["impression", "conclusion", "findings", "diagnosis", "note", "recommendation"]

    for i, line in enumerate(lines):
        clean = line.strip()
        lower = clean.lower()
        if any(keyword in lower for keyword in narrative_keywords):
            # Capture following 1-2 lines of narrative content
            content = clean
            for offset in range(1, 3):
                if i + offset < len(lines):
                    next_line = lines[i + offset].strip()
                    if next_line and not any(kw in next_line.lower() for kw in narrative_keywords):
                        content += " • " + next_line
            if len(content) > 10 and content not in findings:
                findings.append(content[:150])

    # De-duplicate while preserving order
    unique_findings = []
    seen = set()
    for f in findings:
        if f not in seen:
            unique_findings.append(f)
            seen.add(f)

    return unique_findings


def parse_document_pages(
    pages: List[DocumentPage]
) -> Tuple[List[ExtractedParameter], List[str], Optional[str]]:
    """
    Process all extracted document pages into structured clinical parameters and narrative findings.
    """
    extracted_parameters: List[ExtractedParameter] = []
    full_text_corpus = []
    detected_date = None

    for page in pages:
        full_text_corpus.append(page.raw_text)

        if not detected_date:
            detected_date = extract_report_date(page.raw_text)

        lines = page.raw_text.split("\n")
        for line in lines:
            param = parse_table_line(line, page.page_number, page.extraction_method)
            if param:
                # Avoid duplicate extraction of the identical test from the same line
                if not any(
                    p.test_name == param.test_name and p.source_page == param.source_page for p in extracted_parameters
                ):
                    extracted_parameters.append(param)

    combined_text = "\n".join(full_text_corpus)
    clinical_findings = extract_clinical_findings(combined_text, extracted_parameters)

    return extracted_parameters, clinical_findings, detected_date
