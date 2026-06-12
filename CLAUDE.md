# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**모닥** — 관심사로 모이는 종합 커뮤니티 플랫폼. 게시글/댓글/대댓글, 검색·정렬·페이지네이션, FAQ 챗봇, 카테고리별 운영자, 쪽지, 실시간 알림(SSE), 방문자 집계.

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic
- **Frontend:** Next.js 14 (App Router), TypeScript, TanStack Query v5, Tailwind CSS

## Commands

### Backend
```powershell
cd backend
.\venv\Scripts\Activate.ps1            # venv 활성화
cp .env.example .env                   # 최초 1회 — DATABASE_URL, SECRET_KEY, OPENAI_API_KEY
alembic upgrade head                   # 마이그레이션 (생성: alembic revision --autogenerate -m "설명")
uvicorn app.main:app --reload --port 8000   # API 문서: http://localhost:8000/docs
$env:PYTHONIOENCODING="utf-8"; python seed.py   # 시드 (DB 초기화 후 재삽입)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
npx tsc --noEmit   # 타입 체크
```

## Architecture

백엔드 레이어 순서: `api/v1/`(라우터·권한체크) → `services/`(비즈니스 로직) → `repository/`(순수 async DB) → `models/`(ORM). 스키마는 `schemas/`(Pydantic v2).

상세는 아래 주제별 문서 참고 — **해당 영역 작업 전 관련 문서를 먼저 읽을 것.**

| 문서 | 내용 |
|------|------|
| [docs/backend.md](docs/backend.md) | 레이어, 인증/로그인잠금, 세션·MissingGreenlet, API 공통 규약, seed.py |
| [docs/frontend.md](docs/frontend.md) | 핵심 모듈, 컴포넌트, 라우트, SSR/Navbar 주의사항, CSS |
| [docs/categories.md](docs/categories.md) | 33개 카테고리 구조, 추가 절차 |
| [docs/moderation.md](docs/moderation.md) | 운영자 시스템, 차단, 권한, 엔드포인트 |
| [docs/comments.md](docs/comments.md) | 댓글·대댓글(1단계) 구조 |
| [docs/messaging-notifications.md](docs/messaging-notifications.md) | 쪽지, 실시간 알림(SSE) |
| [docs/chatbot.md](docs/chatbot.md) | LangChain 챗봇, tool calling, rate limiting |
| [docs/visitor-tracking.md](docs/visitor-tracking.md) | 방문자 집계 규칙 |

## 핵심 규칙 (버그 예방 — 위반 시 작업 낭비)

- **JWT `sub` = username** (user_id 아님).
- **bcrypt:** `requirements.txt`에 `bcrypt==4.0.1` 고정 (passlib 1.7.4 호환).
- **MissingGreenlet:** DB 쿼리는 commit(`increment_view_count` 등) **이전**에 모아 호출. 자세히는 docs/backend.md.
- **카테고리:** DB 기반 동적. 프론트에서 slug 하드코딩 금지 (`useSortedCategoryGroups()` 사용).
- **인기글 기준:** `post_repository.HOT_THRESHOLD = 100` 단일 소스.
- **seed.py:** PowerShell에서 `$env:PYTHONIOENCODING="utf-8"` 필수. 새 테이블 추가 시 TRUNCATE 목록에도 추가.
- **SSR:** localStorage 접근(`isAuthenticated()` 등)은 `useEffect` + `mounted` 확인 후.
- **Navbar:** 드롭다운 `onBlur` 금지(click-outside 사용). `NAV_BREAKPOINTS` 클래스는 Tailwind JIT용 정적 문자열로 선언.
- **파일 다운로드:** `${NEXT_PUBLIC_API_URL}/files/${file.id}` 직접 생성 (헬퍼 만들지 말 것).
- **auth-change 이벤트:** `setToken()`/`removeToken()`이 dispatch → Navbar·NotificationBell·VisitorCount가 구독해 즉시 갱신.
