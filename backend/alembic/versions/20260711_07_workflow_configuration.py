"""add editable workflow configuration

Revision ID: 20260711_07
Revises: 20260711_06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_07"
down_revision: Union[str, None] = "20260711_06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "workflow_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("submission_steps", sa.JSON(), nullable=False),
        sa.Column("feedback_reviewers", sa.JSON(), nullable=False),
        sa.Column("feedback_status_labels", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.execute(
        "INSERT INTO workflow_configs (id, submission_steps, feedback_reviewers, feedback_status_labels) VALUES "
        "(1, '[\"Transmittal Preparation\", \"DCO Backup\", \"Signature Process\", \"Workflow Initiation\", \"Email Feedback\", \"Data Registration\"]', "
        "'[\"UTIBER\", \"GDS\"]', '{\"A\": \"Approved\", \"B\": \"Approved with comments\", \"C\": \"Rejected\", \"P\": \"Pending\"}')"
    )

def downgrade() -> None:
    op.drop_table("workflow_configs")
