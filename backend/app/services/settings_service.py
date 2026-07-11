from datetime import datetime, timezone
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.models.column_config import ColumnConfig
from app.models.package import Package
from app.schemas.settings import CONFIGURABLE_FIELDS, ColumnConfigUpdate, MetadataImport

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
    def export(self):
        packages = list(self.db.scalars(select(Package).order_by(Package.order_index, Package.id)))
        return {"format_version":"1.0", "exported_at":datetime.now(timezone.utc), "packages":packages, "column_configs":self.list_configs()}
    def import_metadata(self, payload: MetadataImport, mode: str):
        created = updated = configs_updated = 0
        if mode == "replace":
            self.db.execute(delete(Package)); self.db.flush()
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
