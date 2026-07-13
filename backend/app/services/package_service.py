from datetime import date
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories.package_repository import PackageRepository
from app.schemas.package import PackageCreate, PackageUpdate
from app.services.notification_service import NotificationService

class PackageService:
    def __init__(self, db: Session): self.repo = PackageRepository(db)
    def create(self, data: PackageCreate):
        values = data.model_dump()
        if not values["document_number"].strip():
            values["document_number"] = f"DRAFT-{date.today():%Y%m%d}-{uuid4().hex[:8].upper()}"
        return self.repo.create(values)
    def update(self, package_id: int, data: PackageUpdate):
        item = self.require(package_id)
        values = data.model_dump(exclude_unset=True)
        if values.get("document_number") is not None and not values["document_number"].strip():
            values["document_number"] = f"DRAFT-{date.today():%Y%m%d}-{uuid4().hex[:8].upper()}"
        tracked = [key for key in ("workflow_terminated", "submission_progress", "feedback", "feedback_status") if key in values and values[key] != getattr(item, key)]
        updated = self.repo.update(item, values)
        notifications = NotificationService(self.repo.db)
        if "submission_progress" in tracked:
            notifications.create_submission_progress_update(
                workflow_number=updated.workflow_number, document_number=updated.document_number,
                message=f"Submission progress updated for {updated.document_number}.",
            )
        feedback_changes = [key for key in ("workflow_terminated", "feedback", "feedback_status") if key in tracked]
        if feedback_changes:
            labels = {"workflow_terminated":"workflow termination", "feedback":"feedback", "feedback_status":"feedback status"}
            notifications.create_workflow_feedback_update(
                workflow_number=updated.workflow_number, document_number=updated.document_number,
                message=f"Updated {', '.join(labels[key] for key in feedback_changes)} for {updated.document_number}.",
            )
        return updated
    def require(self, package_id: int):
        item = self.repo.get(package_id)
        if not item: raise HTTPException(status_code=404, detail="Package not found")
        return item
    def duplicate(self, package_id: int):
        item = self.require(package_id)
        # Keep the same document number: revisions/submissions may share it.
        # Append -COPY only as a visual cue that this is a cloned register row.
        number = f"{item.document_number}-COPY"
        values = {
            "document_number": number, "document_title": item.document_title, "document_date": item.document_date, "document_type": item.document_type,
            "initiator": item.initiator, "discipline": item.discipline, "number_of_documents": item.number_of_documents,
            "transmittal_number": None, "workflow_number": None, "workflow_terminated": False,
            "notes": item.notes, "has_attachment": item.has_attachment, "is_abandoned": False,
            "submission_progress": {step: False for step in item.submission_progress},
            "feedback": {step: False for step in item.feedback}, "feedback_status": {reviewer:"P" for reviewer in item.feedback_status},
            "order_index": item.order_index + 1,
        }
        return self.repo.create(values)
