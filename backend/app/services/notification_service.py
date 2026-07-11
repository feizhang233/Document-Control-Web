from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.notification import Notification

class NotificationService:
    def __init__(self, db: Session): self.db = db
    def create_workflow_update(self, *, workflow_number: str | None, document_number: str, message: str):
        item = Notification(
            notification_type="workflow",
            title=f"Workflow {workflow_number or 'not assigned'} updated",
            message=message,
            workflow_number=workflow_number,
            document_number=document_number,
        )
        self.db.add(item); self.db.commit(); self.db.refresh(item); return item
    def list(self, limit: int = 30):
        items = list(self.db.scalars(select(Notification).order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)))
        unread = self.db.scalar(select(func.count()).select_from(Notification).where(Notification.is_read.is_(False))) or 0
        return items, unread
    def mark_read(self, notification_id: int):
        item = self.db.get(Notification, notification_id)
        if not item: return None
        item.is_read = True; self.db.commit(); self.db.refresh(item); return item
    def mark_all_read(self):
        for item in self.db.scalars(select(Notification).where(Notification.is_read.is_(False))): item.is_read = True
        self.db.commit()
