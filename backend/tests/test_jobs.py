import pytest
import io

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_prometheus_metrics(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text

def test_unauthenticated_upload_denied(client):
    file_data = {"file": ("test_sheet.pdf", io.BytesIO(b"dummy pdf contents"), "application/pdf")}
    response = client.post("/jobs/upload", files=file_data)
    
    # Missing OAuth2 bearer token should return 401
    assert response.status_code == 401

def test_upload_job_flow(client):
    # Register and login to retrieve access token
    client.post("/auth/register", json={
        "email": "admin@permit-iq.com",
        "password": "adminpassword123",
        "role": "Admin"
    })
    
    login_res = client.post("/auth/login", data={
        "username": "admin@permit-iq.com",
        "password": "adminpassword123"
    })
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    file_data = {"file": ("stairwell_design.pdf", io.BytesIO(b"dummy pdf contents"), "application/pdf")}
    
    # Upload file
    response = client.post("/jobs/upload", files=file_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "stairwell_design.pdf"
    assert data["status"] == "pending"
    
    job_id = data["job_id"]
    
    # Check status
    status_response = client.get(f"/jobs/{job_id}/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["job_id"] == job_id
