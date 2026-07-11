import pytest

def test_user_registration(client):
    response = client.post("/auth/register", json={
        "email": "engineer@permit-iq.com",
        "password": "securepassword123",
        "role": "Engineer"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "engineer@permit-iq.com"
    assert data["role"] == "Engineer"

def test_user_login(client):
    # Register user first
    client.post("/auth/register", json={
        "email": "reviewer@permit-iq.com",
        "password": "reviewerpassword123",
        "role": "Reviewer"
    })
    
    # Login
    response = client.post("/auth/login", data={
        "username": "reviewer@permit-iq.com",
        "password": "reviewerpassword123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password(client):
    response = client.post("/auth/login", data={
        "username": "reviewer@permit-iq.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
