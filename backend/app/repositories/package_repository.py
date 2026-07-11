from __future__ import annotations

from datetime import datetime, timedelta, timezone
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session
from app.models.package import Package

SORTABLE_FIELDS = {"document_number","document_date","document_type","initiator","discipline","number_of_documents","transmittal_number","workflow_number","workflow_terminated","is_abandoned","has_attachment","order_index","created_at","updated_at"}

class PackageRepository:
    def __init__(self, db: Session): self.db = db
    def list(self, *, period: str, search: str | None, discipline: str | None, document_type: str | None, sort_by: str, sort_order: str, page: int, page_size: int):
        query = select(Package)
        if period != "all":
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            start = now - timedelta(days={"week": 7, "month": 30, "year": 365}[period])
            query = query.where(Package.created_at >= start)
        if search:
            term = f"%{search}%"
            query = query.where(or_(Package.document_number.like(term), Package.workflow_number.like(term), Package.transmittal_number.like(term), Package.initiator.like(term), Package.discipline.like(term)))
        if discipline: query = query.where(Package.discipline == discipline)
        if document_type: query = query.where(Package.document_type == document_type)
        count = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        field = getattr(Package, sort_by if sort_by in SORTABLE_FIELDS else "order_index")
        order = asc(field) if sort_order == "asc" else desc(field)
        items = list(self.db.scalars(query.order_by(order, Package.id).offset((page-1)*page_size).limit(page_size)))
        return items, count
    def get(self, package_id: int): return self.db.get(Package, package_id)
    def get_by_document_number(self, number: str): return self.db.scalar(select(Package).where(Package.document_number == number))
    def get_by_workflow_number(self, number: str): return self.db.scalars(select(Package).where(Package.workflow_number == number)).first()
    def create(self, values: dict):
        item = Package(**values); self.db.add(item); self.db.commit(); self.db.refresh(item); return item
    def update(self, item: Package, values: dict):
        for key, value in values.items(): setattr(item, key, value)
        self.db.commit(); self.db.refresh(item); return item
    def delete(self, item: Package): self.db.delete(item); self.db.commit()
    def reorder(self, ids: list[int]):
        items = {p.id:p for p in self.db.scalars(select(Package).where(Package.id.in_(ids)))}
        if len(items) != len(set(ids)): return False
        for index, item_id in enumerate(ids): items[item_id].order_index = index
        self.db.commit(); return True
