"""allow duplicate document numbers (revisions)

Revision ID: 20260711_08
Revises: 20260711_07

Document numbers are not unique — the same number can represent different
revisions or independent submission records.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260711_08"
down_revision: Union[str, None] = "20260711_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _document_number_unique_names(inspector) -> set[str]:
    names: set[str] = set()
    for item in inspector.get_unique_constraints("packages"):
        if item.get("name") and item.get("column_names") == ["document_number"]:
            names.add(item["name"])
    for item in inspector.get_indexes("packages"):
        if item.get("name") and item.get("unique") and item.get("column_names") == ["document_number"]:
            names.add(item["name"])
    return names


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    inspector = sa.inspect(bind)

    unique_names = _document_number_unique_names(inspector)
    if dialect == "mysql":
        for name in unique_names:
            # MySQL unique constraints often surface as unique indexes.
            op.drop_index(name, table_name="packages")
    else:
        with op.batch_alter_table("packages") as batch:
            for name in unique_names:
                batch.drop_constraint(name, type_="unique")

    # Non-unique index for search/filter performance.
    inspector = sa.inspect(bind)
    has_index = any(
        item.get("name") == "ix_packages_document_number"
        or (not item.get("unique") and item.get("column_names") == ["document_number"])
        for item in inspector.get_indexes("packages")
    )
    if not has_index:
        op.create_index("ix_packages_document_number", "packages", ["document_number"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    # Downgrade can only re-add uniqueness when values are already unique.
    duplicates = bind.execute(
        sa.text(
            "SELECT document_number FROM packages "
            "GROUP BY document_number HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicates:
        raise RuntimeError(
            "Cannot restore unique constraint on document_number while duplicate values exist"
        )

    for item in inspector.get_indexes("packages"):
        if item.get("name") == "ix_packages_document_number":
            op.drop_index("ix_packages_document_number", table_name="packages")
            break

    op.create_unique_constraint("uq_packages_document_number", "packages", ["document_number"])
