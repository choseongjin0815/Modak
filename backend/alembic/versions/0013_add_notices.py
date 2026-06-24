"""add notices table

Revision ID: a0b1c2d3e4f5
Revises: f9a0b1c2d3e4
Create Date: 2026-06-24
"""
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, None] = 'f9a0b1c2d3e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_pinned', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notices_title', 'notices', ['title'])
    op.create_index('ix_notices_author_id', 'notices', ['author_id'])
    op.create_index('ix_notices_is_pinned', 'notices', ['is_pinned'])
    op.create_index('ix_notices_created_at', 'notices', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_notices_created_at', table_name='notices')
    op.drop_index('ix_notices_is_pinned', table_name='notices')
    op.drop_index('ix_notices_author_id', table_name='notices')
    op.drop_index('ix_notices_title', table_name='notices')
    op.drop_table('notices')
