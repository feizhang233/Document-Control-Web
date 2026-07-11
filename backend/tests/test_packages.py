from app.schemas.package import FEEDBACK_STEPS, SUBMISSION_STEPS

def payload(number="DOC-CIV-001"):
    return {"document_number":number,"document_date":"2026-07-11","document_type":"Drawing","initiator":"Ana Petrović","discipline":"Civil","number_of_documents":4,"transmittal_number":"TR-001","workflow_number":"WF-001","submission_progress":{s:False for s in SUBMISSION_STEPS},"feedback":{s:False for s in FEEDBACK_STEPS},"order_index":0}

def test_package_crud(client):
    created=client.post("/api/packages",json=payload()).json()
    assert created["document_number"]=="DOC-CIV-001"
    assert created["document_date"]=="2026-07-11"
    assert set(created["feedback"]) == {"UTIBER", "GDS", "Terminate"}
    assert created["feedback_status"] == {"UTIBER":"P", "GDS":"P"}
    response=client.get("/api/packages",params={"period":"all","search":"Ana"})
    assert response.status_code==200 and response.json()["total"]==1
    updated=client.patch(f"/api/packages/{created['id']}",json={"number_of_documents":9})
    assert updated.json()["number_of_documents"]==9
    assert client.delete(f"/api/packages/{created['id']}").status_code==204

def test_duplicate_document_number_allowed_for_revisions(client):
    first = client.post("/api/packages", json=payload()).json()
    second = client.post("/api/packages", json=payload())
    assert second.status_code == 201, second.text
    assert second.json()["document_number"] == first["document_number"]
    assert second.json()["id"] != first["id"]
    items = client.get("/api/packages", params={"period":"all","search":"DOC-CIV-001"}).json()
    assert items["total"] == 2

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

def test_csv_import_appends_and_replaces_documents(client):
    original = client.post("/api/packages", json=payload()).json()
    merged = client.post("/api/metadata/import-csv?mode=merge", json={"rows":[
        {"document_number":"DOC-CIV-001","initiator":"CSV owner","has_attachment":True},
        {"document_number":"DOC-CSV-002","document_date":"2026-07-12","document_type":"Drawing","discipline":"Civil","number_of_documents":2,"notes":"Imported from CSV"},
    ]})
    assert merged.status_code == 200, merged.text
    assert merged.json()["packages_created"] == 2 and merged.json()["packages_updated"] == 0
    # Original row is unchanged; merge always appends (revisions may share document numbers).
    original_after = client.get(f"/api/packages/{original['id']}").json()
    assert original_after["initiator"] == "Ana Petrović"
    assert client.get("/api/packages", params={"period":"all"}).json()["total"] == 3
    imported = client.get("/api/packages", params={"period":"all","search":"DOC-CSV-002"}).json()["items"][0]
    assert imported["notes"] == "Imported from CSV" and not any(imported["submission_progress"].values())
    replaced = client.post("/api/metadata/import-csv?mode=replace", json={"rows":[{"document_number":"DOC-REPLACED","number_of_documents":1}]})
    assert replaced.status_code == 200 and replaced.json()["packages_created"] == 1
    assert client.get("/api/packages", params={"period":"all"}).json()["total"] == 1

def test_csv_import_accepts_empty_and_slash_dates(client):
    result = client.post("/api/metadata/import-csv?mode=merge", json={"rows":[
        {"document_number":"DOC-EMPTY-DATE","document_date":"","document_type":"Drawing","initiator":"","discipline":""},
        {"document_number":"DOC-SLASH-DATE","document_date":"12/07/2026","document_type":"Report"},
    ]})
    assert result.status_code == 200, result.text
    assert result.json()["packages_created"] == 2
    empty = client.get("/api/packages", params={"period":"all","search":"DOC-EMPTY-DATE"}).json()["items"][0]
    slash = client.get("/api/packages", params={"period":"all","search":"DOC-SLASH-DATE"}).json()["items"][0]
    assert empty["document_type"] == "Drawing"
    assert slash["document_date"] == "2026-07-12"

def test_csv_import_keeps_duplicate_document_numbers_as_separate_rows(client):
    """Same document_number in one CSV = separate revisions, not collapsed."""
    result = client.post("/api/metadata/import-csv?mode=replace", json={"rows":[
        {"document_number":"NFS-PCH-MST-MEP-PB-002","document_date":"2026-02-10","document_type":"MS","initiator":"First","discipline":"Plumbing","notes":"first revision","workflow_number":"WF-000704"},
        {"document_number":"NFS-PCH-MST-MEP-PB-002","document_date":"2026-02-10","document_type":"MS","initiator":"王亮","discipline":"Plumbing","notes":"second revision","has_attachment":True,"workflow_number":"WF-000705"},
        {"document_number":"DOC-OTHER-001","document_type":"Drawing"},
    ]})
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["packages_created"] == 3
    assert body["packages_updated"] == 0
    items = client.get("/api/packages", params={"period":"all"}).json()
    assert items["total"] == 3
    revisions = client.get("/api/packages", params={"period":"all","search":"NFS-PCH-MST-MEP-PB-002"}).json()["items"]
    assert len(revisions) == 2
    notes = {row["notes"] for row in revisions}
    assert notes == {"first revision", "second revision"}
    workflows = {row["workflow_number"] for row in revisions}
    assert workflows == {"WF-000704", "WF-000705"}

def test_workflow_configuration_reorders_and_remaps_existing_data(client):
    data = payload()
    data["submission_progress"][SUBMISSION_STEPS[0]] = True
    data["feedback"]["UTIBER"] = True
    data["feedback_status"] = {"UTIBER":"A", "GDS":"P"}
    created = client.post("/api/packages", json=data).json()
    current = client.get("/api/settings/workflow")
    assert current.status_code == 200
    assert current.json()["submission_steps"][1] == "DCO Backup"
    changed = client.put("/api/settings/workflow", json={
        "submission_steps":["Preparation","Backup","Signature","Initiation","Email","Registration"],
        "feedback_reviewers":["Reviewer One","Reviewer Two"],
        "feedback_status_labels":{"A":"Accepted","B":"Accepted with comments","C":"Rejected","P":"Pending"},
    })
    assert changed.status_code == 200
    updated = client.get(f"/api/packages/{created['id']}").json()
    assert updated["submission_progress"]["Preparation"] is True
    assert updated["submission_progress"]["Backup"] is False
    assert updated["feedback"]["Reviewer One"] is True
    assert updated["feedback_status"]["Reviewer One"] == "A"
    duplicated = client.post(f"/api/packages/{created['id']}/duplicate").json()
    assert duplicated["feedback_status"] == {"Reviewer One":"P", "Reviewer Two":"P"}

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
        json={"feedback":{"Terminate":True}, "feedback_status":{"UTIBER":"B", "GDS":"P"}, "message":"Daily sync completed the workflow."},
    )
    assert updated.status_code == 200
    assert updated.json()["feedback"]["Terminate"] is True
    assert updated.json()["feedback"]["UTIBER"] is True
    assert updated.json()["feedback_status"] == {"UTIBER":"B", "GDS":"P"}
    assert not any(updated.json()["submission_progress"].values())
    notifications = client.get("/api/notifications").json()
    assert notifications["unread_count"] == 1
    assert notifications["items"][0]["workflow_number"] == "WF-001"
    assert client.patch("/api/notifications/read-all").status_code == 204
    assert client.get("/api/notifications").json()["unread_count"] == 0
