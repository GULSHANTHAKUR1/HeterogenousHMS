import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthEndpoints(unittest.TestCase):
    def test_root_endpoint(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["service"], "Heterogeneous HMS OCR & NLP Microservice")

    def test_health_endpoint(self):
        response = client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "online")


if __name__ == "__main__":
    unittest.main()
