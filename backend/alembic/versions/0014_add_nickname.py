"""add nickname to users

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-06-25
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a0b1c2d3e4f5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NOT NULL + unique 컬럼을 기존 데이터 테이블에 안전하게 추가하는 2단계 절차:
    # 1) nullable 로 추가 → 2) 기존 행 백필 → 3) NOT NULL/unique 확정
    op.add_column('users', sa.Column('nickname', sa.String(length=50), nullable=True))
    op.execute('UPDATE users SET nickname = username WHERE nickname IS NULL')
    op.alter_column('users', 'nickname', nullable=False)
    op.create_unique_constraint('uq_users_nickname', 'users', ['nickname'])
    op.create_index('ix_users_nickname', 'users', ['nickname'])
    op.add_column(
        'users',
        sa.Column('nickname_changed_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'nickname_changed_at')
    op.drop_index('ix_users_nickname', table_name='users')
    op.drop_constraint('uq_users_nickname', 'users', type_='unique')
    op.drop_column('users', 'nickname')
