"""add workflow status and notifications

Revision ID: 20260711_03
Revises: 20260711_02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_03"
down_revision: Union[str, None] = "20260711_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    package_columns = {column["name"] for column in inspector.get_columns("packages")}
    if "workflow_status" not in package_columns:
        op.add_column("packages", sa.Column("workflow_status", sa.String(60), nullable=False, server_default="Pending"))
    if "notifications" not in set(sa.inspect(bind).get_table_names()):
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("notification_type", sa.String(40), nullable=False, server_default="workflow"),
            sa.Column("title", sa.String(180), nullable=False),
            sa.Column("message", sa.String(500), nullable=False),
            sa.Column("workflow_number", sa.String(80), nullable=True),
            sa.Column("document_number", sa.String(80), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
        op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
    existing = bind.execute(sa.text("SELECT COUNT(*) FROM column_configs WHERE field_name = 'workflow_status'")).scalar()
    if not existing:
        op.execute(
            "INSERT INTO column_configs (field_name, display_name, input_type, options) "
            "VALUES ('workflow_status', 'Workflow Status', 'select', "
            "'[\"Pending\", \"In Progress\", \"Awaiting Feedback\", \"Completed\", \"On Hold\"]')"
        )

def downgrade() -> None:
    op.drop_table("notifications")
    op.execute("DELETE FROM column_configs WHERE field_name = 'workflow_status'")
    op.drop_column("packages", "workflow_status")
