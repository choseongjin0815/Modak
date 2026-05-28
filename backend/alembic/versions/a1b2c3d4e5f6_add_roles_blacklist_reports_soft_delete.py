"""add roles blacklist reports soft delete

Revision ID: a1b2c3d4e5f6
Revises: 9f2f55308ae8
Create Date: 2026-05-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9f2f55308ae8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # userrole enum + users.role
    op.execute(sa.text("CREATE TYPE userrole AS ENUM ('USER', 'ADMIN')"))
    op.add_column('users', sa.Column('role',
        sa.Enum('USER', 'ADMIN', name='userrole', create_type=False),
        nullable=False, server_default='USER'))

    # posts 소프트 딜리트
    op.add_column('posts', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('posts', sa.Column('deleted_by_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # comments 소프트 딜리트
    op.add_column('comments', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('comments', sa.Column('deleted_by_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # blacklists 테이블
    op.create_table('blacklists',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('blocker_id', sa.UUID(), nullable=False),
        sa.Column('blocked_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('blocker_id', 'blocked_id'),
    )
    op.create_index(op.f('ix_blacklists_blocker_id'), 'blacklists', ['blocker_id'], unique=False)
    op.create_index(op.f('ix_blacklists_blocked_id'), 'blacklists', ['blocked_id'], unique=False)

    # reports 테이블 — enum은 create_table 시 SQLAlchemy가 자동 생성
    op.create_table('reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('reporter_id', sa.UUID(), nullable=False),
        sa.Column('target_type', sa.Enum('POST', 'COMMENT', name='reporttargettype'), nullable=False),
        sa.Column('target_id', sa.UUID(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RESOLVED', 'REJECTED', name='reportstatus'),
                  nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reports_reporter_id'), 'reports', ['reporter_id'], unique=False)
    op.create_index(op.f('ix_reports_target_id'), 'reports', ['target_id'], unique=False)
    op.create_index(op.f('ix_reports_status'), 'reports', ['status'], unique=False)
    op.create_index(op.f('ix_reports_created_at'), 'reports', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_created_at'), table_name='reports')
    op.drop_index(op.f('ix_reports_status'), table_name='reports')
    op.drop_index(op.f('ix_reports_target_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_reporter_id'), table_name='reports')
    op.drop_table('reports')
    op.execute(sa.text("DROP TYPE IF EXISTS reportstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS reporttargettype"))

    op.drop_index(op.f('ix_blacklists_blocked_id'), table_name='blacklists')
    op.drop_index(op.f('ix_blacklists_blocker_id'), table_name='blacklists')
    op.drop_table('blacklists')

    op.drop_column('comments', 'deleted_by_admin')
    op.drop_column('comments', 'is_deleted')
    op.drop_column('posts', 'deleted_by_admin')
    op.drop_column('posts', 'is_deleted')

    op.drop_column('users', 'role')
    op.execute(sa.text("DROP TYPE IF EXISTS userrole"))
