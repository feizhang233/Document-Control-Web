"""add document title metadata

Revision ID: 20260711_09
Revises: 20260711_08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260711_09"
down_revision: Union[str, None] = "20260711_08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}
    if "document_title" not in columns:
        with op.batch_alter_table("packages") as batch:
            batch.add_column(sa.Column("document_title", sa.String(length=255), nullable=False, server_default=""))

    existing_configs = set(bind.execute(sa.text("SELECT field_name FROM column_configs")).scalars())
    if "document_title" not in existing_configs:
        op.execute(
            "INSERT INTO column_configs (field_name, display_name, input_type, options) "
            "VALUES ('document_title', 'Document Title', 'text', '[]')"
        )


def downgrade() -> None:
    op.execute("DELETE FROM column_configs WHERE field_name = 'document_title'")
    with op.batch_alter_table("packages") as batch:
        batch.drop_column("document_title")
