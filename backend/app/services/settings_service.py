from datetime import date, datetime, timezone
from uuid import uuid4
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from app.models.column_config import ColumnConfig
from app.models.package import Package
from app.models.workflow_config import WorkflowConfig
from app.schemas.settings import CONFIGURABLE_FIELDS, ColumnConfigUpdate, CsvMetadataImport, MetadataImport, WorkflowConfigUpdate

DEFAULT_WORKFLOW = {
    "submission_steps":["Transmittal Preparation","DCO Backup","Signature Process","Workflow Initiation","Email Feedback","Data Registration"],
    "feedback_reviewers":["UTIBER","GDS"],
    "feedback_status_labels":{"A":"Approved","B":"Approved with comments","C":"Rejected","P":"Pending"},
}

class SettingsService:
    def __init__(self, db: Session): self.db = db
    def list_configs(self):
        return list(self.db.scalars(select(ColumnConfig).order_by(ColumnConfig.id)))
    def update_config(self, field_name: str, data: ColumnConfigUpdate):
        if field_name not in CONFIGURABLE_FIELDS: return None
        item = self.db.scalar(select(ColumnConfig).where(ColumnConfig.field_name == field_name))
        if not item: return None
        item.input_type = data.input_type
        item.options = data.options if data.input_type == "select" else []
        self.db.commit(); self.db.refresh(item); return item
    def get_workflow_config(self):
        item = self.db.get(WorkflowConfig, 1)
        if not item:
            item = WorkflowConfig(id=1, **DEFAULT_WORKFLOW); self.db.add(item); self.db.commit(); self.db.refresh(item)
        return item
    def update_workflow_config(self, data: WorkflowConfigUpdate):
        item = self.get_workflow_config()
        old_steps, old_reviewers = item.submission_steps, item.feedback_reviewers
        for package in self.db.scalars(select(Package)):
            package.submission_progress = {new: bool(package.submission_progress.get(old, False)) for old,new in zip(old_steps, data.submission_steps)}
            package.feedback = {new: bool(package.feedback.get(old, False)) for old,new in zip(old_reviewers, data.feedback_reviewers)} | {"Terminate": bool(package.feedback.get("Terminate", False))}
            package.feedback_status = {new: package.feedback_status.get(old, "P") for old,new in zip(old_reviewers, data.feedback_reviewers)}
        item.submission_steps = data.submission_steps
        item.feedback_reviewers = data.feedback_reviewers
        item.feedback_status_labels = data.feedback_status_labels
        self.db.commit(); self.db.refresh(item); return item
    def export(self):
        packages = list(self.db.scalars(select(Package).order_by(Package.order_index, Package.id)))
        return {"format_version":"1.0", "exported_at":datetime.now(timezone.utc), "packages":packages, "column_configs":self.list_configs(), "workflow_config":self.get_workflow_config()}
    def import_metadata(self, payload: MetadataImport, mode: str):
        created = updated = configs_updated = 0
        if mode == "replace":
            self.db.execute(delete(Package)); self.db.flush()
        if payload.workflow_config:
            self.update_workflow_config(payload.workflow_config)
        for row in payload.packages:
            values = row.model_dump(exclude={"created_at","updated_at"})
            item = self.db.scalar(select(Package).where(Package.document_number == row.document_number))
            if item:
                for key,value in values.items(): setattr(item,key,value)
                updated += 1
            else:
                item = Package(**values)
                if row.created_at: item.created_at = row.created_at.replace(tzinfo=None)
                if row.updated_at: item.updated_at = row.updated_at.replace(tzinfo=None)
                self.db.add(item); created += 1
        for incoming in payload.column_configs:
            if incoming.field_name not in CONFIGURABLE_FIELDS: continue
            config = self.db.scalar(select(ColumnConfig).where(ColumnConfig.field_name == incoming.field_name))
            if config:
                config.input_type = incoming.input_type
                config.options = incoming.options if incoming.input_type == "select" else []
                configs_updated += 1
        self.db.commit()
        return {"mode":mode,"packages_created":created,"packages_updated":updated,"configs_updated":configs_updated}
    def import_csv(self, payload: CsvMetadataImport, mode: str):
        created = updated = 0
        if mode == "replace":
            self.db.execute(delete(Package)); self.db.flush()
        workflow = self.get_workflow_config()
        order_index = (self.db.scalar(select(func.max(Package.order_index))) or -1) + 1
        for row in payload.rows:
            values = row.model_dump(exclude_none=True)
            number = values.get("document_number", "").strip()
            if "document_number" in values: values["document_number"] = number
            item = self.db.scalar(select(Package).where(Package.document_number == number)) if number else None
            if item:
                for key, value in values.items(): setattr(item, key, value)
                updated += 1
                continue
            if not number: number = f"DRAFT-{date.today():%Y%m%d}-{uuid4().hex[:8].upper()}"
            defaults = {
                "document_number": number, "document_date": date.today(), "document_type":"", "initiator":"", "discipline":"",
                "number_of_documents":1, "transmittal_number":None, "workflow_number":None, "workflow_terminated":False,
                "notes":"", "has_attachment":False, "is_abandoned":False,
                "submission_progress":{step:False for step in workflow.submission_steps},
                "feedback":{**{reviewer:False for reviewer in workflow.feedback_reviewers}, "Terminate":False},
                "feedback_status":{reviewer:"P" for reviewer in workflow.feedback_reviewers}, "order_index":order_index,
            }
            defaults.update(values); defaults["document_number"] = number
            self.db.add(Package(**defaults)); created += 1; order_index += 1
        self.db.commit()
        return {"mode":mode,"packages_created":created,"packages_updated":updated,"configs_updated":0}
