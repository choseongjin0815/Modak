"""add category moderators table

Revision ID: a3b4c5d6e7f8
Revises: e2f3a4b5c6d7
Create Date: 2026-05-28
"""
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'category_moderators',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'category_id', name='uq_category_moderator'),
    )


def downgrade() -> None:
    op.drop_table('category_moderators')
