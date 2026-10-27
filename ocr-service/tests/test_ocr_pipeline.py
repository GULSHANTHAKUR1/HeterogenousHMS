import io
import unittest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app
from app.config import settings

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Service-Key": settings.OCR_SERVICE_SECRET}


def build_synthetic_pdf(lines: list[str]) -> bytes:
    """
    Generate a valid PDF-1.4 binary document with embedded text stream.
    Requires zero external dependencies.
    """
    stream_content = "BT\n/F1 12 Tf\n50 750 Td\n"
    for line in lines:
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_content += f"({safe_line}) Tj\n0 -20 Td\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin-1")
    length = len(stream_bytes)

    pdf_text = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length {length} >>
stream
{stream_content}endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000280 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
450
%%EOF"""
    return pdf_text.encode("latin-1")


class TestOcrPipeline(unittest.TestCase):
    """
    Automated test suite verifying the OCR/NLP microservice workflow,
    security, file handling, extraction accuracy, and medical safety rules.
    """

    def test_01_unauthorized_access_rejected(self):
        """Security: Missing or invalid internal service key must return HTTP 401."""
        # 1. Missing authorization header
        res_no_auth = client.post(
            "/api/v1/ocr/process-report",
            files={"file": ("test.pdf", b"%PDF-1.4 sample", "application/pdf")},
        )
        self.assertEqual(res_no_auth.status_code, 401)
        self.assertIn("Unauthorized", res_no_auth.json()["detail"])

        # 2. Invalid service key
        res_bad_auth = client.post(
            "/api/v1/ocr/process-report",
            headers={"X-Internal-Service-Key": "unauthorized_external_key_123"},
            files={"file": ("test.pdf", b"%PDF-1.4 sample", "application/pdf")},
        )
        self.assertEqual(res_bad_auth.status_code, 401)

    def test_02_service_status_and_tesseract_detection(self):
        """Verify service readiness and detection of Windows Tesseract OCR executable."""
        response = client.get("/api/v1/ocr/status", headers=AUTH_HEADERS)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertTrue(data["tesseract_available"])
        self.assertIn("tesseract", data["tesseract_version"].lower())

    def test_03_empty_file_rejected(self):
        """Empty files (0 bytes) must be rejected safely with HTTP 400."""
        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_04_malformed_disguised_file_rejected(self):
        """Disguised files must fail magic byte validation with HTTP 400."""
        fake_pdf = b"This is a malicious shell script disguised as a lab report."
        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("fake.pdf", fake_pdf, "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("signature", response.json()["detail"].lower())

    def test_05_encrypted_pdf_rejected(self):
        """Encrypted or password-protected PDF files must be rejected safely with HTTP 400."""
        encrypted_pdf = b"%PDF-1.4\n1 0 obj << /Type /Catalog /Encrypt 2 0 R >> endobj\n%%EOF"
        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("encrypted.pdf", encrypted_pdf, "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("encrypted", response.json()["detail"].lower())

    def test_06_text_pdf_extraction_and_accuracy(self):
        """
        Extract structured parameters from a digital medical report PDF.
        Measures exact extraction precision, units, reference ranges, and candidate flags.
        """
        report_lines = [
            "HETEROGENEOUS HMS DIAGNOSTIC PATHOLOGY",
            "Patient ID: PID-2026-1234",
            "Report Date: 12-10-2026",
            "Hemoglobin 8.5 g/dL (13.0 - 17.0) Low",
            "WBC 6.2 10^3/uL (4.0 - 11.0) Normal",
            "Platelets 1.1 lakhs (1.5 - 4.5) High",
            "Creatinine 0.9 mg/dL (0.6 - 1.2) Normal",
            "Glucose 140 mg/dL (70 - 100) High",
            "Clinical Impression: Hemoglobin is low (8.5 g/dL). Platelets elevated.",
        ]

        pdf_bytes = build_synthetic_pdf(report_lines)

        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("CBC_Chemistry_Report.pdf", pdf_bytes, "application/pdf")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])

        # Validate extracted metadata
        self.assertEqual(data["document_metadata"]["report_date"], "12-10-2026")
        self.assertEqual(data["document_metadata"]["content_type"], "application/pdf")

        params = data["extracted_parameters"]
        self.assertGreaterEqual(len(params), 5)
        param_map = {p["test_name"]: p for p in params}

        # 1. Hemoglobin: 8.5 g/dL (13.0 - 17.0) Low
        self.assertIn("Hemoglobin", param_map)
        hgb = param_map["Hemoglobin"]
        self.assertEqual(hgb["value"], "8.5")
        self.assertEqual(hgb["unit"], "g/dL")
        self.assertEqual(hgb["reference_range"], "13.0 - 17.0")
        self.assertEqual(hgb["abnormality_flag"], "Low")
        self.assertEqual(hgb["review_status"], "PENDING_CLINICIAN_REVIEW")

        # 2. WBC: 6.2 10^3/uL (4.0 - 11.0) Normal
        self.assertIn("WBC", param_map)
        wbc = param_map["WBC"]
        self.assertEqual(wbc["value"], "6.2")
        self.assertEqual(wbc["unit"], "10^3/uL")
        self.assertEqual(wbc["abnormality_flag"], "Normal")

        # 3. Platelets: 1.1 lakhs (1.5 - 4.5) High
        self.assertIn("Platelets", param_map)
        plt = param_map["Platelets"]
        self.assertEqual(plt["value"], "1.1")
        self.assertEqual(plt["unit"], "lakhs")
        self.assertEqual(plt["abnormality_flag"], "High")

        # 4. Creatinine: 0.9 mg/dL (0.6 - 1.2) Normal
        self.assertIn("Creatinine", param_map)
        cr = param_map["Creatinine"]
        self.assertEqual(cr["value"], "0.9")
        self.assertEqual(cr["unit"], "mg/dL")

        # 5. Glucose: 140 mg/dL (70 - 100) High
        self.assertIn("Glucose", param_map)
        glu = param_map["Glucose"]
        self.assertEqual(glu["value"], "140")
        self.assertEqual(glu["unit"], "mg/dL")
        self.assertEqual(glu["abnormality_flag"], "High")

        # Clinical findings should capture abnormal results for clinician review
        self.assertGreater(len(data["clinical_findings"]), 0)
        self.assertTrue(any("Hemoglobin is low" in f for f in data["clinical_findings"]))

    def test_07_image_ocr_extraction_via_tesseract(self):
        """
        Test Tesseract OCR engine on synthetic laboratory report image (PNG).
        Verifies OCR text recognition and parameter structuring.
        """
        from PIL import ImageFont
        try:
            font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 22)
        except Exception:
            font = ImageFont.load_default()

        img = Image.new("RGB", (850, 260), color="white")
        draw = ImageDraw.Draw(img)

        text_lines = [
            "CLINICAL BIOCHEMISTRY REPORT",
            "Hemoglobin 13.5 g/dL (13.0 - 17.0)",
            "Glucose 140 mg/dL (70 - 100) High",
        ]

        y = 25
        for line in text_lines:
            draw.text((30, y), line, fill="black", font=font)
            y += 50

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("lab_report.png", png_bytes, "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])

        params = data["extracted_parameters"]
        self.assertGreaterEqual(len(params), 1)

        param_map = {p["test_name"]: p for p in params}
        self.assertIn("Hemoglobin", param_map)
        hgb = param_map["Hemoglobin"]
        self.assertEqual(hgb["value"], "13.5")
        self.assertEqual(hgb["unit"], "g/dL")
        self.assertEqual(hgb["reference_range"], "13.0 - 17.0")
        self.assertEqual(hgb["extraction_method"], "tesseract_ocr")
        self.assertEqual(hgb["review_status"], "PENDING_CLINICIAN_REVIEW")

    def test_08_medical_safety_no_invented_fields(self):
        """
        CRITICAL MEDICAL SAFETY:
        When a parameter lacks unit or reference range in the source document,
        the service must NOT invent a unit, hallucinate a default range, or convert units silently.
        """
        # Document contains only test name and numerical value
        report_lines = [
            "LABORATORY TEST RESULT",
            "Total Cholesterol 210",
        ]
        pdf_bytes = build_synthetic_pdf(report_lines)

        response = client.post(
            "/api/v1/ocr/process-report",
            headers=AUTH_HEADERS,
            files={"file": ("incomplete_test.pdf", pdf_bytes, "application/pdf")},
        )
        self.assertEqual(response.status_code, 200)
        params = response.json()["extracted_parameters"]

        tc = next((p for p in params if p["test_name"] == "Total Cholesterol"), None)
        self.assertIsNotNone(tc)
        self.assertEqual(tc["value"], "210")
        # Must be None - NOT invented!
        self.assertIsNone(tc["unit"])
        self.assertIsNone(tc["reference_range"])
        self.assertEqual(tc["review_status"], "PENDING_CLINICIAN_REVIEW")


if __name__ == "__main__":
    unittest.main()
