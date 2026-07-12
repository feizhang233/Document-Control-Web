from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.repositories.package_repository import PackageRepository
from app.schemas.package import PackageCreate, PackageList, PackageRead, PackageUpdate, ReorderRequest
from app.services.package_service import PackageService

router = APIRouter(prefix="/packages", tags=["packages"])

@router.get("", response_model=PackageList)
def list_packages(period: Literal["week","month","year","all"]="week", search: str|None=None, discipline: str|None=None, document_type: str|None=None, sort_by: str="order_index", sort_order: Literal["asc","desc"]="asc", page: int=Query(1,ge=1), page_size: int=Query(50,ge=1,le=200), db: Session=Depends(get_db)):
    items,total = PackageRepository(db).list(period=period,search=search,discipline=discipline,document_type=document_type,sort_by=sort_by,sort_order=sort_order,page=page,page_size=page_size)
    return PackageList(items=items,total=total,page=page,page_size=page_size)

@router.get("/{package_id}", response_model=PackageRead)
def get_package(package_id:int, db:Session=Depends(get_db)): return PackageService(db).require(package_id)
@router.post("", response_model=PackageRead, status_code=status.HTTP_201_CREATED)
def create_package(data:PackageCreate, db:Session=Depends(get_db)): return PackageService(db).create(data)
@router.post("/{package_id}/duplicate", response_model=PackageRead, status_code=status.HTTP_201_CREATED)
def duplicate_package(package_id:int, db:Session=Depends(get_db)): return PackageService(db).duplicate(package_id)
@router.patch("/{package_id}", response_model=PackageRead)
def update_package(package_id:int,data:PackageUpdate,db:Session=Depends(get_db)): return PackageService(db).update(package_id,data)
@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(package_id:int,db:Session=Depends(get_db)):
    service=PackageService(db); service.repo.delete(service.require(package_id)); return Response(status_code=204)
@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_packages(data:ReorderRequest,db:Session=Depends(get_db)):
    if not PackageRepository(db).reorder(data.package_ids, data.start_index): raise HTTPException(status_code=400,detail="One or more package IDs do not exist")
    return Response(status_code=204)
