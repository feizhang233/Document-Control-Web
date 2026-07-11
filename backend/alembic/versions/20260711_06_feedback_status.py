"""add per-reviewer feedback status

Revision ID: 20260711_06
Revises: 20260711_05
"""
from typing import Sequence, Union
import json
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_06"
down_revision: Union[str, None] = "20260711_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def as_dict(value):
    if isinstance(value, str): return json.loads(value)
    return value or {}

def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}
    if "feedback_status" not in columns:
        op.add_column("packages", sa.Column("feedback_status", sa.JSON(), nullable=True))
    for row in bind.execute(sa.text("SELECT id, feedback FROM packages")).mappings():
        feedback = as_dict(row["feedback"])
        statuses = {"UTIBER": "A" if feedback.get("UTIBER") else "P", "GDS": "A" if feedback.get("GDS") else "P"}
        bind.execute(sa.text("UPDATE packages SET feedback_status = :status WHERE id = :id"), {"status": json.dumps(statuses), "id": row["id"]})
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("packages") as batch:
            batch.alter_column("feedback_status", existing_type=sa.JSON(), nullable=False)
    else:
        op.alter_column("packages", "feedback_status", existing_type=sa.JSON(), nullable=False)

def downgrade() -> None:
    op.drop_column("packages", "feedback_status")
