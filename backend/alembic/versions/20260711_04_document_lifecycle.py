"""add document lifecycle metadata

Revision ID: 20260711_04
Revises: 20260711_03
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_04"
down_revision: Union[str, None] = "20260711_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}
    if "notes" not in columns:
        if bind.dialect.name == "mysql":
            op.add_column("packages", sa.Column("notes", sa.Text(), nullable=True))
            op.execute("UPDATE packages SET notes = '' WHERE notes IS NULL")
            op.alter_column("packages", "notes", existing_type=sa.Text(), nullable=False)
        else:
            op.add_column("packages", sa.Column("notes", sa.Text(), nullable=False, server_default=""))
    additions = [
        ("has_attachment", sa.Column("has_attachment", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("is_abandoned", sa.Column("is_abandoned", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("workflow_terminated", sa.Column("workflow_terminated", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("terminated_feedback", sa.Column(
            "terminated_feedback", sa.JSON(), nullable=False,
            server_default=sa.text("(JSON_OBJECT())") if bind.dialect.name == "mysql" else sa.text("'{}'"),
        )),
    ]
    for name, column in additions:
        if name not in columns: op.add_column("packages", column)
    indexes = {item["name"] for item in sa.inspect(bind).get_indexes("packages")}
    if "ix_packages_is_abandoned" not in indexes: op.create_index("ix_packages_is_abandoned", "packages", ["is_abandoned"])
    if "ix_packages_workflow_terminated" not in indexes: op.create_index("ix_packages_workflow_terminated", "packages", ["workflow_terminated"])

def downgrade() -> None:
    op.drop_index("ix_packages_workflow_terminated", table_name="packages")
    op.drop_index("ix_packages_is_abandoned", table_name="packages")
    for name in ("terminated_feedback", "workflow_terminated", "is_abandoned", "has_attachment", "notes"):
        op.drop_column("packages", name)
