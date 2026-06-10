"""categories table - replace enum with fk

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. categories 테이블 생성
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('slug', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('group', sa.String(50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=True)

    # 2. 기존 카테고리 데이터 삽입
    op.execute(sa.text("""
        INSERT INTO categories (slug, name, "group", sort_order) VALUES
        ('domestic_soccer', '국내축구', '스포츠', 1),
        ('intl_soccer', '해외축구', '스포츠', 2),
        ('domestic_baseball', '국내야구', '스포츠', 3),
        ('intl_baseball', '해외야구', '스포츠', 4),
        ('domestic_stock', '국내주식', '투자', 5),
        ('intl_stock', '해외주식', '투자', 6),
        ('crypto', '코인', '투자', 7)
    """))

    # 3. posts 테이블에 category_id FK 컬럼 추가
    op.add_column('posts', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_posts_category_id', 'posts', 'categories',
        ['category_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index(op.f('ix_posts_category_id'), 'posts', ['category_id'], unique=False)

    # 4. 기존 category ENUM 데이터를 category_id로 마이그레이션
    #    LOWER()로 대소문자 모두 처리 (DOMESTIC_SOCCER / domestic_soccer 양쪽 대응)
    op.execute(sa.text("""
        UPDATE posts SET category_id = c.id
        FROM categories c
        WHERE LOWER(posts.category::text) = c.slug
        AND posts.category IS NOT NULL
    """))

    # 5. 기존 category ENUM 컬럼 삭제
    op.drop_index(op.f('ix_posts_category'), table_name='posts')
    op.drop_column('posts', 'category')

    # 6. PostgreSQL ENUM 타입 삭제
    op.execute(sa.text("DROP TYPE IF EXISTS category"))


def downgrade() -> None:
    # 기존 ENUM 타입 재생성
    op.execute(sa.text("""
        CREATE TYPE category AS ENUM (
            'domestic_soccer', 'intl_soccer', 'domestic_baseball', 'intl_baseball',
            'domestic_stock', 'intl_stock', 'crypto'
        )
    """))

    # category 컬럼 재추가
    op.add_column('posts', sa.Column(
        'category',
        sa.Enum('domestic_soccer', 'intl_soccer', 'domestic_baseball', 'intl_baseball',
                'domestic_stock', 'intl_stock', 'crypto', name='category', create_type=False),
        nullable=True,
    ))
    op.create_index(op.f('ix_posts_category'), 'posts', ['category'], unique=False)

    # 데이터 복원
    op.execute(sa.text("""
        UPDATE posts SET category = c.slug::category
        FROM categories c
        WHERE posts.category_id = c.id
        AND posts.category_id IS NOT NULL
    """))

    # category_id 컬럼 삭제
    op.drop_index(op.f('ix_posts_category_id'), table_name='posts')
    op.drop_constraint('fk_posts_category_id', 'posts', type_='foreignkey')
    op.drop_column('posts', 'category_id')

    # categories 테이블 삭제
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.drop_table('categories')
