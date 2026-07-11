from app.schemas.package import FEEDBACK_STEPS, SUBMISSION_STEPS

def payload(number="DOC-CIV-001"):
    return {"document_number":number,"document_date":"2026-07-11","document_type":"Drawing","initiator":"Ana Petrović","discipline":"Civil","number_of_documents":4,"transmittal_number":"TR-001","workflow_number":"WF-001","submission_progress":{s:False for s in SUBMISSION_STEPS},"feedback":{s:False for s in FEEDBACK_STEPS},"order_index":0}

def test_package_crud(client):
    created=client.post("/api/packages",json=payload()).json()
    assert created["document_number"]=="DOC-CIV-001"
    assert created["document_date"]=="2026-07-11"
    assert set(created["feedback"]) == {"UTIBER", "GDS", "Terminate"}
    response=client.get("/api/packages",params={"period":"all","search":"Ana"})
    assert response.status_code==200 and response.json()["total"]==1
    updated=client.patch(f"/api/packages/{created['id']}",json={"number_of_documents":9})
    assert updated.json()["number_of_documents"]==9
    assert client.delete(f"/api/packages/{created['id']}").status_code==204

def test_duplicate_document_number_returns_conflict(client):
    assert client.post("/api/packages",json=payload()).status_code==201
    assert client.post("/api/packages",json=payload()).status_code==409

def test_reorder(client):
    first=client.post("/api/packages",json=payload("DOC-001")).json()
    second=client.post("/api/packages",json=payload("DOC-002")).json()
    assert client.post("/api/packages/reorder",json={"package_ids":[second["id"],first["id"]]}).status_code==204
    items=client.get("/api/packages",params={"period":"all"}).json()["items"]
    assert [i["id"] for i in items]==[second["id"],first["id"]]

def test_duplicate_and_lifecycle_metadata(client):
    created=client.post("/api/packages",json=payload()).json()
    duplicate=client.post(f"/api/packages/{created['id']}/duplicate")
    assert duplicate.status_code==201
    assert duplicate.json()["document_number"]=="DOC-CIV-001-COPY"
    assert duplicate.json()["workflow_number"] is None
    updated=client.patch(f"/api/packages/{created['id']}",json={"notes":"Stopped by client instruction.","has_attachment":True,"is_abandoned":True,"workflow_terminated":True})
    assert updated.status_code==200
    assert updated.json()["has_attachment"] is True and updated.json()["is_abandoned"] is True

def test_column_config_and_metadata_backup(client):
    client.post("/api/packages", json=payload())
    configs = client.get("/api/settings/columns").json()
    assert len(configs) == 0  # migrations seed production defaults; test creates one below

    from app.models.column_config import ColumnConfig
    from conftest import TestingSession
    with TestingSession() as db:
        db.add(ColumnConfig(field_name="discipline", display_name="Discipline", input_type="text", options=[])); db.commit()
    changed = client.put("/api/settings/columns/discipline", json={"input_type":"select","options":["Civil","Civil","Rail"]})
    assert changed.status_code == 200 and changed.json()["options"] == ["Civil","Rail"]
    backup = client.get("/api/metadata/export")
    assert backup.status_code == 200 and backup.json()["packages"][0]["document_number"] == "DOC-CIV-001"
    result = client.post("/api/metadata/import?mode=replace", json=backup.json())
    assert result.status_code == 200 and result.json()["packages_created"] == 1

def test_blank_document_number_creates_draft(client):
    data = payload("")
    data.update({"document_type":"", "initiator":"", "discipline":""})
    response = client.post("/api/packages", json=data)
    assert response.status_code == 201
    assert response.json()["document_number"].startswith("DRAFT-")

def test_external_workflow_update_creates_notification(client):
    client.post("/api/packages", json=payload())
    denied = client.patch("/api/external/workflows/WF-001", headers={"X-API-Key":"wrong"}, json={"status":"Completed"})
    assert denied.status_code == 401
    updated = client.patch(
        "/api/external/workflows/WF-001",
        headers={"X-API-Key":"test-external-key"},
        json={"feedback":{"UTIBER":True, "Terminate":True}, "message":"Daily sync completed the workflow."},
    )
    assert updated.status_code == 200
    assert updated.json()["feedback"]["Terminate"] is True
    assert not any(updated.json()["submission_progress"].values())
    notifications = client.get("/api/notifications").json()
    assert notifications["unread_count"] == 1
    assert notifications["items"][0]["workflow_number"] == "WF-001"
    assert client.patch("/api/notifications/read-all").status_code == 204
    assert client.get("/api/notifications").json()["unread_count"] == 0
