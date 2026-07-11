import secrets
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.repositories.package_repository import PackageRepository
from app.schemas.notification import ExternalWorkflowUpdate
from app.schemas.package import PackageRead
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/external", tags=["external automation"])

def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if not secrets.compare_digest(x_api_key, settings.external_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")

@router.patch("/workflows/{workflow_number}", response_model=PackageRead, dependencies=[Depends(verify_api_key)])
def update_workflow(workflow_number: str, data: ExternalWorkflowUpdate, db: Session = Depends(get_db)):
    repo = PackageRepository(db)
    item = repo.get_by_workflow_number(workflow_number)
    if not item: raise HTTPException(status_code=404, detail="Workflow not found")
    values = {}
    if data.submission_progress is not None: values["submission_progress"] = {**item.submission_progress, **data.submission_progress}
    if data.feedback is not None: values["feedback"] = {**item.feedback, **data.feedback}
    if data.terminate_workflow is not None: values["workflow_terminated"] = data.terminate_workflow
    if not values: raise HTTPException(status_code=400, detail="No workflow status fields supplied")
    item = repo.update(item, values)
    detail = data.message or ("Workflow terminated." if data.terminate_workflow else "Workflow feedback or submission progress updated.")
    NotificationService(db).create_workflow_update(workflow_number=workflow_number, document_number=item.document_number, message=detail)
    return item
