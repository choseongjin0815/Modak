"""add visits table

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-06-02
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd7e8f9a0b1c2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'visits',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('visitor_key', sa.String(200), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_visits_created_at', 'visits', ['created_at'])


def downgrade() -> None:
    op.drop_table('visits')
