"""separate submission and feedback notifications

Revision ID: 20260713_15
Revises: 20260713_14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20260713_15"
down_revision: Union[str, None] = "20260713_14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE notifications SET notification_type = 'submission_progress' "
        "WHERE LOWER(message) LIKE '%submission progress%' "
        "AND LOWER(message) NOT LIKE '%feedback%' "
        "AND LOWER(message) NOT LIKE '%termination%'"
    )
    op.execute("UPDATE notifications SET notification_type = 'workflow_feedback' WHERE notification_type NOT IN ('submission_progress', 'workflow_feedback')")


def downgrade() -> None:
    op.execute("UPDATE notifications SET notification_type = 'workflow'")
