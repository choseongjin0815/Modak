"""add image_generations table

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
Create Date: 2026-06-18
"""
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'f9a0b1c2d3e4'
down_revision: Union[str, None] = 'e8f9a0b1c2d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'image_generations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('stored_filename', sa.String(length=255), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_image_generations_user_id', 'image_generations', ['user_id'])
    op.create_index('ix_image_generations_post_id', 'image_generations', ['post_id'])
    op.create_index('ix_image_generations_created_at', 'image_generations', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_image_generations_created_at', table_name='image_generations')
    op.drop_index('ix_image_generations_post_id', table_name='image_generations')
    op.drop_index('ix_image_generations_user_id', table_name='image_generations')
    op.drop_table('image_generations')
