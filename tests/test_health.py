"""Health and smoke tests for SubsidyX Command Center."""
from starlette.testclient import TestClient
from app.main import app

def test_health():
    client = TestClient(app, base_url="http://testserver")
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "whatsapp_mode" in data

def test_login_page():
    client = TestClient(app, base_url="http://testserver")
    response = client.get("/login")
    assert response.status_code == 200
    assert "One-Stop Subsidy Market Place" in response.text
