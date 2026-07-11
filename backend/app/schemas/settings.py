from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.package import PackageCreate

CONFIGURABLE_FIELDS = {
    "document_number", "document_date", "document_type", "initiator", "discipline",
    "number_of_documents", "transmittal_number", "workflow_number",
}

class WorkflowConfigUpdate(BaseModel):
    submission_steps: list[str] = Field(min_length=6, max_length=6)
    feedback_reviewers: list[str] = Field(min_length=2, max_length=2)
    feedback_status_labels: dict[Literal["A","B","C","P"], str]
    @field_validator("submission_steps", "feedback_reviewers")
    @classmethod
    def validate_unique_names(cls, value: list[str]):
        cleaned = [item.strip() for item in value]
        if any(not item for item in cleaned) or len(set(cleaned)) != len(cleaned): raise ValueError("Workflow names must be non-empty and unique")
        return cleaned
    @field_validator("feedback_status_labels")
    @classmethod
    def validate_status_labels(cls, value: dict[str, str]):
        cleaned = {code: label.strip() for code, label in value.items()}
        if any(not label for label in cleaned.values()): raise ValueError("Feedback status labels must not be empty")
        return cleaned

class WorkflowConfigRead(WorkflowConfigUpdate):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ColumnConfigRead(BaseModel):
    id: int
    field_name: str
    display_name: str
    input_type: Literal["text", "select"]
    options: list[str]
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ColumnConfigUpdate(BaseModel):
    input_type: Literal["text", "select"]
    options: list[str] = Field(default_factory=list, max_length=100)
    @field_validator("options")
    @classmethod
    def clean_options(cls, value: list[str]):
        return list(dict.fromkeys(v.strip() for v in value if v.strip()))

class MetadataPackage(PackageCreate):
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class MetadataExport(BaseModel):
    format_version: Literal["1.0"] = "1.0"
    exported_at: datetime
    packages: list[MetadataPackage]
    column_configs: list[ColumnConfigRead]
    workflow_config: WorkflowConfigRead

class MetadataImport(BaseModel):
    format_version: Literal["1.0"]
    packages: list[MetadataPackage] = Field(default_factory=list, max_length=10000)
    column_configs: list[ColumnConfigRead] = Field(default_factory=list)
    workflow_config: WorkflowConfigUpdate | None = None

class MetadataImportResult(BaseModel):
    mode: Literal["merge", "replace"]
    packages_created: int
    packages_updated: int
    configs_updated: int

class CsvImportRow(BaseModel):
    document_number: str | None = Field(default=None, max_length=80)
    document_date: date | None = None
    document_type: str | None = Field(default=None, max_length=80)
    initiator: str | None = Field(default=None, max_length=120)
    discipline: str | None = Field(default=None, max_length=80)
    number_of_documents: int | None = Field(default=None, ge=1)
    transmittal_number: str | None = Field(default=None, max_length=80)
    workflow_number: str | None = Field(default=None, max_length=80)
    workflow_terminated: bool | None = None
    has_attachment: bool | None = None
    is_abandoned: bool | None = None
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator(
        "document_number", "document_type", "initiator", "discipline",
        "transmittal_number", "workflow_number", "notes",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("document_date", mode="before")
    @classmethod
    def normalize_document_date(cls, value):
        if value is None:
            return None
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(text, fmt).date()
                except ValueError:
                    continue
            raise ValueError("document_date must be a valid date (YYYY-MM-DD preferred)")
        return value

class CsvMetadataImport(BaseModel):
    rows: list[CsvImportRow] = Field(min_length=1, max_length=10000)
