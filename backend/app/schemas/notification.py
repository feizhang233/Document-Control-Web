from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.package import FEEDBACK_STEPS, SUBMISSION_STEPS

class NotificationRead(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    workflow_number: str | None
    document_number: str | None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class NotificationList(BaseModel):
    items: list[NotificationRead]
    unread_count: int

class ExternalWorkflowUpdate(BaseModel):
    submission_progress: dict[str, bool] | None = None
    feedback: dict[str, bool] | None = None
    terminate_workflow: bool | None = None
    message: str | None = Field(default=None, max_length=500)
    @field_validator("submission_progress")
    @classmethod
    def validate_progress(cls, value):
        if value is not None and not set(value).issubset(SUBMISSION_STEPS): raise ValueError("Unknown submission progress step")
        return value
    @field_validator("feedback")
    @classmethod
    def validate_feedback(cls, value):
        if value is not None and not set(value).issubset(FEEDBACK_STEPS): raise ValueError("Unknown feedback organisation")
        return value
