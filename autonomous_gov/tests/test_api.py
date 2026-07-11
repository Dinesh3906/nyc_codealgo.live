import pytest
from fastapi.testclient import TestClient
from autonomous_gov.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["monitor"] == "RegulationMonitor"

def test_discovery_check_endpoint():
    response = client.post("/discovery/check")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    delta = data[0]
    assert delta["section_id"] == "1109.2"
    assert "shifted from 60.0 to 72.0" in delta["diff_summary"]

def test_promotion_workflow_endpoints():
    # 1. Trigger discovery check to register workflow
    disc_res = client.post("/discovery/check")
    assert disc_res.status_code == 200
    
    # 2. Get active workflow details by checking the return states
    # Because endpoints run concurrently, we can promote the first update
    # In order to get the update_id, let's query the app state directly
    from autonomous_gov.api.app import approval_workflow
    update_ids = list(approval_workflow.registry.keys())
    assert len(update_ids) > 0
    update_id = update_ids[0]
    
    # 3. Promote through SME Review
    response_sme = client.post(f"/approval/promote?update_id={update_id}&reviewer_id=sme_user&role=SME&approve=true")
    assert response_sme.status_code == 200
    assert response_sme.json()["stage"] == "LEGAL_REVIEW"
    
    # 4. Promote through Legal Review
    response_legal = client.post(f"/approval/promote?update_id={update_id}&reviewer_id=legal_user&role=LEGAL&approve=true")
    assert response_legal.status_code == 200
    assert response_legal.json()["stage"] == "PROMOTED"
