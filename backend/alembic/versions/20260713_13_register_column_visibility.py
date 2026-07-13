"""add per-register column visibility

Revision ID: 20260713_13
Revises: 20260713_12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_13"
down_revision: Union[str, None] = "20260713_12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("column_configs") as batch:
        batch.add_column(sa.Column("is_visible_workflow", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column("is_visible_transmittal", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    with op.batch_alter_table("column_configs") as batch:
        batch.drop_column("is_visible_transmittal")
        batch.drop_column("is_visible_workflow")
