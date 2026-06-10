"""카테고리 확장 - 7개 → 33개 재편

Revision ID: f1a2b3c4d5e6
Revises: b2c3d4e5f6a7
Create Date: 2026-05-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. 기존 slug·name·group·sort_order 업데이트
    op.execute(sa.text("UPDATE categories SET slug='kbo',      name='KBO 야구',  \"group\"='스포츠',   sort_order=1  WHERE slug='domestic_baseball'"))
    op.execute(sa.text("UPDATE categories SET slug='mlb',      name='MLB 야구',  \"group\"='스포츠',   sort_order=2  WHERE slug='intl_baseball'"))
    op.execute(sa.text("UPDATE categories SET slug='kleague',  name='K리그',     \"group\"='스포츠',   sort_order=3  WHERE slug='domestic_soccer'"))
    op.execute(sa.text("UPDATE categories SET                                    \"group\"='스포츠',   sort_order=4  WHERE slug='intl_soccer'"))
    op.execute(sa.text("UPDATE categories SET                                    \"group\"='투자·경제', sort_order=10 WHERE slug='domestic_stock'"))
    op.execute(sa.text("UPDATE categories SET slug='us_stock', name='미국주식',  \"group\"='투자·경제', sort_order=11 WHERE slug='intl_stock'"))
    op.execute(sa.text("UPDATE categories SET                                    \"group\"='투자·경제', sort_order=12 WHERE slug='crypto'"))

    # 2. 신규 카테고리 삽입
    op.execute(sa.text("""
        INSERT INTO categories (slug, name, "group", sort_order) VALUES
        ('kbl',           'KBL 농구',      '스포츠',    5),
        ('nba',           'NBA 농구',      '스포츠',    6),
        ('kovo',          'V리그 배구',    '스포츠',    7),
        ('golf',          '골프',          '스포츠',    8),
        ('sports_etc',    '기타스포츠',    '스포츠',    9),
        ('realestate',    '부동산',        '투자·경제', 13),
        ('kpop',          'K-POP',         '연예·문화', 14),
        ('drama',         '드라마',        '연예·문화', 15),
        ('movie',         '영화',          '연예·문화', 16),
        ('entertainment', '예능',          '연예·문화', 17),
        ('webtoon',       '웹툰·소설',     '연예·문화', 18),
        ('lol',           '리그오브레전드','게임',      19),
        ('fc_online',     'FC온라인',      '게임',      20),
        ('maplestory',    '메이플스토리',  '게임',      21),
        ('smartphone',    '스마트폰',      'IT·테크',   22),
        ('laptop',        '노트북',        'IT·테크',   23),
        ('food',          '맛집·카페',     '라이프',    24),
        ('travel',        '여행',          '라이프',    25),
        ('fashion',       '패션·뷰티',     '라이프',    26),
        ('health',        '헬스·다이어트', '라이프',    27),
        ('car',           '자동차',        '라이프',    28),
        ('domestic_news', '국내이슈',      '시사·뉴스', 29),
        ('intl_news',     '해외이슈',      '시사·뉴스', 30),
        ('politics',      '정치·사회',     '시사·뉴스', 31),
        ('economy_news',  '경제뉴스',      '시사·뉴스', 32),
        ('free',          '자유게시판',    NULL,         33)
    """))


def downgrade() -> None:
    # 신규 카테고리 삭제 (posts.category_id는 FK SET NULL으로 NULL 처리됨)
    op.execute(sa.text("""
        DELETE FROM categories WHERE slug IN (
            'kbl','nba','kovo','golf','sports_etc','realestate',
            'kpop','drama','movie','entertainment','webtoon',
            'lol','fc_online','maplestory',
            'smartphone','laptop',
            'food','travel','fashion','health','car',
            'domestic_news','intl_news','politics','economy_news','free'
        )
    """))
    # 기존 slug·name·group·sort_order 원복
    op.execute(sa.text("UPDATE categories SET slug='domestic_baseball', name='국내야구', \"group\"='스포츠', sort_order=3 WHERE slug='kbo'"))
    op.execute(sa.text("UPDATE categories SET slug='intl_baseball',     name='해외야구', \"group\"='스포츠', sort_order=4 WHERE slug='mlb'"))
    op.execute(sa.text("UPDATE categories SET slug='domestic_soccer',   name='국내축구', \"group\"='스포츠', sort_order=1 WHERE slug='kleague'"))
    op.execute(sa.text("UPDATE categories SET                                            \"group\"='스포츠', sort_order=2 WHERE slug='intl_soccer'"))
    op.execute(sa.text("UPDATE categories SET                                            \"group\"='투자',   sort_order=5 WHERE slug='domestic_stock'"))
    op.execute(sa.text("UPDATE categories SET slug='intl_stock',        name='해외주식', \"group\"='투자',   sort_order=6 WHERE slug='us_stock'"))
    op.execute(sa.text("UPDATE categories SET                                            \"group\"='투자',   sort_order=7 WHERE slug='crypto'"))
