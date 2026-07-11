from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.package import PackageCreate

CONFIGURABLE_FIELDS = {
    "document_number", "document_date", "document_type", "initiator", "discipline",
    "number_of_documents", "transmittal_number", "workflow_number",
}

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

class MetadataImport(BaseModel):
    format_version: Literal["1.0"]
    packages: list[MetadataPackage] = Field(default_factory=list, max_length=10000)
    column_configs: list[ColumnConfigRead] = Field(default_factory=list)

class MetadataImportResult(BaseModel):
    mode: Literal["merge", "replace"]
    packages_created: int
    packages_updated: int
    configs_updated: int
