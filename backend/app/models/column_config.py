from datetime import datetime
from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ColumnConfig(Base):
    __tablename__ = "column_configs"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    input_type: Mapped[str] = mapped_column(String(20), default="text", nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
