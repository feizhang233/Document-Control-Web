"""replace workflow status with feedback termination

Revision ID: 20260711_05
Revises: 20260711_04
"""
from typing import Sequence, Union
import json
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_05"
down_revision: Union[str, None] = "20260711_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def as_dict(value):
    if isinstance(value, str): return json.loads(value)
    return value or {}

def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}
    feedback_columns = "id, feedback, terminated_feedback" if "terminated_feedback" in columns else "id, feedback"
    for row in bind.execute(sa.text(f"SELECT {feedback_columns} FROM packages")).mappings():
        feedback = as_dict(row["feedback"])
        terminated = as_dict(row.get("terminated_feedback"))
        migrated = {
            "UTIBER": bool(feedback.get("UTIBER", False)),
            "GDS": bool(feedback.get("GDS", feedback.get("GDD", False))),
            "Terminate": bool(feedback.get("Terminate", False) or any(terminated.values())),
        }
        bind.execute(sa.text("UPDATE packages SET feedback = :feedback WHERE id = :id"), {"feedback": json.dumps(migrated), "id": row["id"]})
    if "terminated_feedback" in columns: op.drop_column("packages", "terminated_feedback")
    if "workflow_status" in columns: op.drop_column("packages", "workflow_status")
    op.execute("DELETE FROM column_configs WHERE field_name = 'workflow_status'")

def downgrade() -> None:
    op.add_column("packages", sa.Column("workflow_status", sa.String(60), nullable=False, server_default="Pending"))
    op.add_column("packages", sa.Column("terminated_feedback", sa.JSON(), nullable=True))
