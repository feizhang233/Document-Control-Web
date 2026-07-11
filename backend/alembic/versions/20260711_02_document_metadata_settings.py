"""rename document number and add metadata settings

Revision ID: 20260711_02
Revises: 20260711_01
"""
from typing import Sequence, Union
import json
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_02"
down_revision: Union[str, None] = "20260711_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_CONFIGS = [
    ("document_number", "Document Number", "text", []),
    ("document_date", "Date", "text", []),
    ("document_type", "Document Type", "select", ["Drawing", "Technical Report", "Method Statement", "Specification", "Calculation"]),
    ("initiator", "Initiator", "text", []),
    ("discipline", "Discipline", "select", ["Civil", "Structural", "Architectural", "Electrical", "Mechanical", "Geotechnical"]),
    ("number_of_documents", "Number of Documents", "text", []),
    ("transmittal_number", "Transmittal Number", "text", []),
    ("workflow_number", "Workflow Number", "text", []),
]

def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}

    if "package_number" in columns and "document_number" in columns:
        raise RuntimeError("packages contains both package_number and document_number; manual review is required")

    if dialect == "mysql":
        # Older installations may have a MySQL-generated unique index name
        # (for example `package_number`) instead of the Alembic constraint name.
        if "package_number" in columns:
            inspector = sa.inspect(bind)
            unique_names = {
                item["name"]
                for item in inspector.get_unique_constraints("packages")
                if item.get("name") and item.get("column_names") == ["package_number"]
            }
            unique_names.update(
                item["name"]
                for item in inspector.get_indexes("packages")
                if item.get("name") and item.get("unique") and item.get("column_names") == ["package_number"]
            )
            for name in unique_names:
                op.drop_index(name, table_name="packages")
            op.alter_column(
                "packages", "package_number", new_column_name="document_number",
                existing_type=sa.String(80), existing_nullable=False,
            )
        columns = {column["name"] for column in sa.inspect(bind).get_columns("packages")}
        if "document_date" not in columns:
            op.add_column("packages", sa.Column("document_date", sa.Date(), nullable=False, server_default=sa.text("(CURRENT_DATE)")))
        inspector = sa.inspect(bind)
        has_document_unique = any(
            item.get("column_names") == ["document_number"]
            for item in inspector.get_unique_constraints("packages")
        ) or any(
            item.get("unique") and item.get("column_names") == ["document_number"]
            for item in inspector.get_indexes("packages")
        )
        if not has_document_unique:
            op.create_unique_constraint("uq_packages_document_number", "packages", ["document_number"])
        if not any(item.get("column_names") == ["document_date"] for item in sa.inspect(bind).get_indexes("packages")):
            op.create_index("ix_packages_document_date", "packages", ["document_date"])
    else:
        # Batch mode keeps the migration portable for SQLite-based tests.
        with op.batch_alter_table("packages") as batch:
            if "package_number" in columns:
                unique_names = [
                    item["name"] for item in sa.inspect(bind).get_unique_constraints("packages")
                    if item.get("name") and item.get("column_names") == ["package_number"]
                ]
                for name in unique_names:
                    batch.drop_constraint(name, type_="unique")
                batch.alter_column("package_number", new_column_name="document_number", existing_type=sa.String(80), existing_nullable=False)
                batch.create_unique_constraint("uq_packages_document_number", ["document_number"])
            if "document_date" not in columns:
                batch.add_column(sa.Column("document_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")))
                batch.create_index("ix_packages_document_date", ["document_date"])

    tables = set(sa.inspect(bind).get_table_names())
    if "column_configs" not in tables:
        op.create_table(
            "column_configs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("field_name", sa.String(80), nullable=False),
            sa.Column("display_name", sa.String(120), nullable=False),
            sa.Column("input_type", sa.String(20), nullable=False, server_default="text"),
            sa.Column("options", sa.JSON(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("field_name", name="uq_column_configs_field_name"),
        )
    existing_configs = set(bind.execute(sa.text("SELECT field_name FROM column_configs")).scalars())
    for field_name, display_name, input_type, options in DEFAULT_CONFIGS:
        if field_name in existing_configs:
            continue
        options_json = json.dumps(options)
        op.execute(
            "INSERT INTO column_configs (field_name, display_name, input_type, options) "
            f"VALUES ('{field_name}', '{display_name}', '{input_type}', '{options_json}')"
        )

def downgrade() -> None:
    op.drop_table("column_configs")
    with op.batch_alter_table("packages") as batch:
        batch.drop_index("ix_packages_document_date")
        batch.drop_constraint("uq_packages_document_number", type_="unique")
        batch.drop_column("document_date")
        batch.alter_column("document_number", new_column_name="package_number", existing_type=sa.String(80), existing_nullable=False)
        batch.create_unique_constraint("uq_packages_package_number", ["package_number"])
