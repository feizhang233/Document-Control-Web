"""add configurable transmittal prefixes

Revision ID: 20260713_12
Revises: 20260711_11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_12"
down_revision: Union[str, None] = "20260711_11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_PREFIXES = '["NFS-PCH-TRA-PZI-", "NFS-PCH-TRA-RFI-", "NFS-PCH-TRA-RPT-"]'


def upgrade() -> None:
    with op.batch_alter_table("workflow_configs") as batch:
        batch.add_column(sa.Column("transmittal_prefixes", sa.JSON(), nullable=True))
    op.execute(f"UPDATE workflow_configs SET transmittal_prefixes = '{DEFAULT_PREFIXES}' WHERE transmittal_prefixes IS NULL")
    with op.batch_alter_table("workflow_configs") as batch:
        batch.alter_column("transmittal_prefixes", existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("workflow_configs") as batch:
        batch.drop_column("transmittal_prefixes")
