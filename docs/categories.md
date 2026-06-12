# 카테고리 구조

DB 기반 동적 카테고리. 총 33개, 7개 대분류 + 자유게시판. 프론트에서 slug 하드코딩 금지.

| 대분류(`group`) | 소분류 slug |
|----------------|------------|
| 스포츠 | `kbo` `mlb` `kleague` `intl_soccer` `kbl` `nba` `kovo` `golf` `sports_etc` |
| 투자·경제 | `domestic_stock` `us_stock` `crypto` `realestate` |
| 연예·문화 | `kpop` `drama` `movie` `entertainment` `webtoon` |
| 게임 | `lol` `fc_online` `maplestory` |
| IT·테크 | `smartphone` `laptop` |
| 라이프 | `food` `travel` `fashion` `health` `car` |
| 시사·뉴스 | `domestic_news` `intl_news` `politics` `economy_news` |
| *(없음 → "기타")* | `free` |

## 카테고리 추가 절차

1. 마이그레이션 작성 (`alembic revision` 후 INSERT 작성)
2. `seed.py`의 `TITLES`·`WEIGHTS` dict 업데이트
3. `chatbot.py`의 `_CATEGORY_GROUPS` 업데이트 (자연어 그룹명 → slug 매핑)

## 프론트 사용

- `useSortedCategoryGroups()` — `/categories/group-stats`로 그룹별 게시글 수를 받아 정렬. Navbar 반응형 숨김 순서 결정.
- `useCategoryGroups()` — 그룹별 분류만 필요할 때.
