"""add customizable label colors

Revision ID: 20260711_11
Revises: 20260711_10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260711_11"
down_revision: Union[str, None] = "20260711_10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DOCUMENT_TYPE_COLORS = '{"Drawing":"#3164ce","Technical Report":"#7453be","Method Statement":"#b06a1d","Specification":"#21815d","Calculation":"#9b4d80"}'
FEEDBACK_COLORS = '{"A":"#21815d","B":"#9b6816","C":"#b13f4c","P":"#4267bd"}'


def upgrade() -> None:
    with op.batch_alter_table("column_configs") as batch:
        batch.add_column(sa.Column("option_colors", sa.JSON(), nullable=True))
    op.execute("UPDATE column_configs SET option_colors = '{}' WHERE option_colors IS NULL")
    op.execute(f"UPDATE column_configs SET option_colors = '{DOCUMENT_TYPE_COLORS}' WHERE field_name = 'document_type'")
    with op.batch_alter_table("column_configs") as batch:
        batch.alter_column("option_colors", existing_type=sa.JSON(), nullable=False)

    with op.batch_alter_table("workflow_configs") as batch:
        batch.add_column(sa.Column("feedback_status_colors", sa.JSON(), nullable=True))
    op.execute(f"UPDATE workflow_configs SET feedback_status_colors = '{FEEDBACK_COLORS}' WHERE feedback_status_colors IS NULL")
    with op.batch_alter_table("workflow_configs") as batch:
        batch.alter_column("feedback_status_colors", existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("workflow_configs") as batch:
        batch.drop_column("feedback_status_colors")
    with op.batch_alter_table("column_configs") as batch:
        batch.drop_column("option_colors")
