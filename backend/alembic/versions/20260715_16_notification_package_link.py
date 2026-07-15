"""link notifications to packages

Revision ID: 20260715_16
Revises: 20260713_15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260715_16"
down_revision: Union[str, None] = "20260713_15"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("package_id", sa.Integer(), nullable=True))
    op.create_index("ix_notifications_package_id", "notifications", ["package_id"])
    op.execute(
        "UPDATE notifications SET package_id = ("
        "SELECT packages.id FROM packages "
        "WHERE packages.document_number = notifications.document_number "
        "ORDER BY packages.id DESC LIMIT 1"
        ") WHERE document_number IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_package_id", table_name="notifications")
    op.drop_column("notifications", "package_id")
