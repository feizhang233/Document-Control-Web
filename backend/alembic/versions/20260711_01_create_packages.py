"""create packages table"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "packages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("package_number", sa.String(80), nullable=False),
        sa.Column("document_type", sa.String(80), nullable=False),
        sa.Column("initiator", sa.String(120), nullable=False),
        sa.Column("discipline", sa.String(80), nullable=False),
        sa.Column("number_of_documents", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("transmittal_number", sa.String(80), nullable=True),
        sa.Column("workflow_number", sa.String(80), nullable=True),
        sa.Column("submission_progress", sa.JSON(), nullable=False),
        sa.Column("feedback", sa.JSON(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("package_number", name="uq_packages_package_number"),
    )
    op.create_index("ix_packages_workflow_number", "packages", ["workflow_number"])
    op.create_index("ix_packages_transmittal_number", "packages", ["transmittal_number"])
    op.create_index("ix_packages_created_at", "packages", ["created_at"])
    op.create_index("ix_packages_order_index", "packages", ["order_index"])

def downgrade() -> None:
    op.drop_table("packages")
