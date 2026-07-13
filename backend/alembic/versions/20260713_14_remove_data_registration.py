"""remove Data Registration submission step

Revision ID: 20260713_14
Revises: 20260713_13
"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_14"
down_revision: Union[str, None] = "20260713_13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_STEPS = ["Transmittal Preparation", "DCO Backup", "Signature Process", "Workflow Initiation", "Email Feedback"]


def _json(value):
    return json.loads(value) if isinstance(value, str) else (value or {})


def _five_steps(value):
    steps = [step for step in _json(value) if str(step).strip().lower() not in {"data registration", "data register"}]
    for step in DEFAULT_STEPS:
        if len(steps) >= 5:
            break
        if step not in steps:
            steps.append(step)
    return steps[:5]


def upgrade() -> None:
    bind = op.get_bind()
    configured_steps = DEFAULT_STEPS
    for row in bind.execute(sa.text("SELECT id, submission_steps FROM workflow_configs")).mappings():
        steps = _five_steps(row["submission_steps"])
        configured_steps = steps
        bind.execute(sa.text("UPDATE workflow_configs SET submission_steps = :steps WHERE id = :id"), {"steps": json.dumps(steps), "id": row["id"]})
    for row in bind.execute(sa.text("SELECT id, submission_progress FROM packages")).mappings():
        progress = _json(row["submission_progress"])
        migrated = {step: bool(progress.get(step, False)) for step in configured_steps}
        bind.execute(sa.text("UPDATE packages SET submission_progress = :progress WHERE id = :id"), {"progress": json.dumps(migrated), "id": row["id"]})


def downgrade() -> None:
    bind = op.get_bind()
    for row in bind.execute(sa.text("SELECT id, submission_steps FROM workflow_configs")).mappings():
        steps = list(_json(row["submission_steps"]))
        if "Data Registration" not in steps:
            steps.append("Data Registration")
        bind.execute(sa.text("UPDATE workflow_configs SET submission_steps = :steps WHERE id = :id"), {"steps": json.dumps(steps), "id": row["id"]})
    for row in bind.execute(sa.text("SELECT id, submission_progress FROM packages")).mappings():
        progress = dict(_json(row["submission_progress"]))
        progress.setdefault("Data Registration", False)
        bind.execute(sa.text("UPDATE packages SET submission_progress = :progress WHERE id = :id"), {"progress": json.dumps(progress), "id": row["id"]})
