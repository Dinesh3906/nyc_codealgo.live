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

def test_discovery_check_endpoint(monkeypatch):
    import autonomous_gov.api.app as gov_app

    monkeypatch.setattr(
        gov_app.monitor,
        "check_for_source_updates",
        lambda: [{
            "source_name": "NYC DOB",
            "url": "https://www.nyc.gov/dob/bulletins/stairwell_amendment_2026.pdf",
            "hash": "hash-v2.0",
            "action": "MODIFIED",
            "section_affected": "1109.2",
            "old_text": "WC turning clearance must be at least 60 inches in restroom.",
            "new_text": "WC turning clearance must be at least 72 inches in restroom.",
        }]
    )

    response = client.post("/discovery/check")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    delta = data[0]
    assert delta["section_id"] == "1109.2"
    assert "shifted from 60.0 to 72.0" in delta["diff_summary"]

def test_promotion_workflow_endpoints(monkeypatch):
    import autonomous_gov.api.app as gov_app

    monkeypatch.setattr(
        gov_app.monitor,
        "check_for_source_updates",
        lambda: [{
            "source_name": "NYC DOB",
            "url": "https://www.nyc.gov/dob/bulletins/stairwell_amendment_2026.pdf",
            "hash": "hash-v2.0",
            "action": "MODIFIED",
            "section_affected": "1109.2",
            "old_text": "WC turning clearance must be at least 60 inches in restroom.",
            "new_text": "WC turning clearance must be at least 72 inches in restroom.",
        }]
    )

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
