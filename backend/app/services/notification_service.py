from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from app.models.notification import Notification

class NotificationService:
    def __init__(self, db: Session): self.db = db
    def _create_update(self, *, notification_type: str, title: str, workflow_number: str | None, document_number: str, message: str):
        item = Notification(
            notification_type=notification_type,
            title=title,
            message=message,
            workflow_number=workflow_number,
            document_number=document_number,
        )
        self.db.add(item); self.db.commit(); self.db.refresh(item); return item
    def create_submission_progress_update(self, *, workflow_number: str | None, document_number: str, message: str):
        return self._create_update(
            notification_type="submission_progress",
            title=f"Submission progress · {document_number}",
            workflow_number=workflow_number, document_number=document_number, message=message,
        )
    def create_workflow_feedback_update(self, *, workflow_number: str | None, document_number: str, message: str):
        return self._create_update(
            notification_type="workflow_feedback",
            title=f"Workflow feedback · {workflow_number or document_number}",
            workflow_number=workflow_number, document_number=document_number, message=message,
        )
    def list(self, limit: int = 30):
        items = list(self.db.scalars(select(Notification).order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)))
        unread = self.db.scalar(select(func.count()).select_from(Notification).where(Notification.is_read.is_(False))) or 0
        return items, unread
    def mark_read(self, notification_id: int):
        item = self.db.get(Notification, notification_id)
        if not item: return None
        item.is_read = True; self.db.commit(); self.db.refresh(item); return item
    def mark_all_read(self):
        self.db.execute(update(Notification).where(Notification.is_read.is_(False)).values(is_read=True)); self.db.commit()
    def clear_all(self):
        self.db.execute(delete(Notification)); self.db.commit()
