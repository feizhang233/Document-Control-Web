"""add editable column layout settings

Revision ID: 20260711_10
Revises: 20260711_09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260711_10"
down_revision: Union[str, None] = "20260711_09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

WIDTHS = {
    "document_number": 165, "document_title": 220, "document_date": 110,
    "document_type": 135, "initiator": 135, "discipline": 110,
    "number_of_documents": 72, "transmittal_number": 165,
    "workflow_number": 135, "submission_progress": 180, "feedback": 220,
}


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("column_configs")}
    with op.batch_alter_table("column_configs") as batch:
        if "is_visible" not in columns:
            batch.add_column(sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.true()))
        if "column_width" not in columns:
            batch.add_column(sa.Column("column_width", sa.Integer(), nullable=False, server_default="140"))

    existing = set(bind.execute(sa.text("SELECT field_name FROM column_configs")).scalars())
    for field_name, display_name in (("submission_progress", "Submission Progress"), ("feedback", "Feedback")):
        if field_name not in existing:
            bind.execute(sa.text(
                "INSERT INTO column_configs "
                "(field_name, display_name, is_visible, column_width, input_type, options) "
                "VALUES (:field_name, :display_name, true, :width, 'text', '[]')"
            ), {"field_name":field_name, "display_name":display_name, "width":WIDTHS[field_name]})
    for field_name, width in WIDTHS.items():
        bind.execute(sa.text(
            "UPDATE column_configs SET column_width = :width WHERE field_name = :field_name"
        ), {"field_name":field_name, "width":width})


def downgrade() -> None:
    op.execute("DELETE FROM column_configs WHERE field_name IN ('submission_progress', 'feedback')")
    with op.batch_alter_table("column_configs") as batch:
        batch.drop_column("column_width")
        batch.drop_column("is_visible")
