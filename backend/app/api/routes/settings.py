from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.settings import ColumnConfigRead, ColumnConfigUpdate, MetadataExport, MetadataImport, MetadataImportResult
from app.services.settings_service import SettingsService

router = APIRouter(tags=["settings"])

@router.get("/settings/columns", response_model=list[ColumnConfigRead])
def list_column_configs(db: Session = Depends(get_db)): return SettingsService(db).list_configs()

@router.put("/settings/columns/{field_name}", response_model=ColumnConfigRead)
def update_column_config(field_name: str, data: ColumnConfigUpdate, db: Session = Depends(get_db)):
    item = SettingsService(db).update_config(field_name, data)
    if not item: raise HTTPException(status_code=404, detail="Configurable column not found")
    return item

@router.get("/metadata/export", response_model=MetadataExport)
def export_metadata(db: Session = Depends(get_db)): return SettingsService(db).export()

@router.post("/metadata/import", response_model=MetadataImportResult)
def import_metadata(data: MetadataImport, mode: Literal["merge","replace"] = Query("merge"), db: Session = Depends(get_db)):
    return SettingsService(db).import_metadata(data, mode)
