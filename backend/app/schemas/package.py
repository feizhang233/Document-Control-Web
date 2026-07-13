from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

SUBMISSION_STEPS = ["Transmittal Preparation","DCO Backup","Signature Process","Workflow Initiation","Email Feedback"]
FEEDBACK_STEPS = ["UTIBER","GDS","Terminate"]
FEEDBACK_STATUS_VALUES = {"A", "B", "C", "P"}

class PackageBase(BaseModel):
    document_number: str = Field(default="", max_length=80)
    document_title: str = Field(default="", max_length=255)
    document_date: date = Field(default_factory=date.today)
    document_type: str = Field(default="", max_length=80)
    initiator: str = Field(default="", max_length=120)
    discipline: str = Field(default="", max_length=80)
    number_of_documents: int = Field(default=1, ge=1)
    transmittal_number: str | None = Field(default=None, max_length=80)
    workflow_number: str | None = Field(default=None, max_length=80)
    workflow_terminated: bool = False
    notes: str = Field(default="", max_length=5000)
    has_attachment: bool = False
    is_abandoned: bool = False
    submission_progress: dict[str, bool] = Field(default_factory=lambda: {step: False for step in SUBMISSION_STEPS})
    feedback: dict[str, bool] = Field(default_factory=lambda: {step: False for step in FEEDBACK_STEPS})
    feedback_status: dict[str, str] = Field(default_factory=lambda: {"UTIBER":"P", "GDS":"P"})
    order_index: int = Field(default=0, ge=0)
    @field_validator("submission_progress")
    @classmethod
    def validate_progress(cls, value: dict[str,bool]):
        if len(value) != 5: raise ValueError("submission_progress must contain exactly five workflow steps")
        return value
    @field_validator("feedback", mode="before")
    @classmethod
    def validate_feedback(cls, value: dict[str,bool]):
        if isinstance(value, dict) and "GDD" in value:
            value = {"UTIBER": value.get("UTIBER", False), "GDS": value.get("GDS", value.get("GDD", False)), "Terminate": value.get("Terminate", False)}
        if len(value) != 3 or "Terminate" not in value: raise ValueError("feedback must contain two reviewers and Terminate")
        return value
    @field_validator("feedback_status")
    @classmethod
    def validate_feedback_status(cls, value: dict[str,str]):
        if len(value) != 2 or any(status not in FEEDBACK_STATUS_VALUES for status in value.values()):
            raise ValueError("feedback_status must contain two reviewers using A, B, C, or P")
        return value

class PackageCreate(PackageBase): pass
class PackageUpdate(BaseModel):
    document_number: str | None = Field(default=None, max_length=80)
    document_title: str | None = Field(default=None, max_length=255)
    document_date: date | None = None
    document_type: str | None = Field(default=None, max_length=80)
    initiator: str | None = Field(default=None, max_length=120)
    discipline: str | None = Field(default=None, max_length=80)
    number_of_documents: int | None = Field(default=None, ge=1)
    transmittal_number: str | None = Field(default=None, max_length=80)
    workflow_number: str | None = Field(default=None, max_length=80)
    workflow_terminated: bool | None = None
    notes: str | None = Field(default=None, max_length=5000)
    has_attachment: bool | None = None
    is_abandoned: bool | None = None
    submission_progress: dict[str, bool] | None = None
    feedback: dict[str, bool] | None = None
    feedback_status: dict[str, str] | None = None
    order_index: int | None = Field(default=None, ge=0)

class PackageRead(PackageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PackageList(BaseModel):
    items: list[PackageRead]
    total: int
    page: int
    page_size: int
class ReorderRequest(BaseModel):
    package_ids: list[int] = Field(min_length=1)
    start_index: int = Field(default=0, ge=0)
