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
uvicorn app.main:app --reload --port 8001   # API 문서: http://localhost:8001/docs
$env:PYTHONIOENCODING="utf-8"; python seed.py   # 시드 (DB 초기화 후 재삽입)
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --port 3001   # http://localhost:3001
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

## 하네스: 모닥 풀스택 기능 개발

**목표:** 백엔드↔프론트 경계면 정합성을 보장하며 풀스택 기능을 구현하는 에이전트 팀 운영.

**트리거:** 새 기능 추가, 화면+API 동시 구현, 백엔드/프론트가 함께 바뀌는 작업 요청 시 `modak-feature-orchestrator` 스킬을 사용하라. 단순 단일 파일 수정·질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-18 | 초기 구성 (planner·backend·frontend·qa 4인 팀 + 5스킬) | 전체 | - |
| 2026-06-24 | 기동 전 `pip install -r requirements.txt` 의존성 동기화 단계 추가 | skills/backend-feature | venv slowapi 미설치로 uvicorn 기동 반복 실패 |
| 2026-06-24 | `_workspace/` → `_workspace*/`로 gitignore 확장 | .gitignore | 보관본(`_workspace_prev` 등)도 추적 제외 |
| 2026-06-25 | `_workspace/current` + `history/NN_<기능명>/` 구조로 개편 | _workspace | _workspace_prev* 무한 누적 안티패턴 해소 |
| 2026-06-25 | 완료 후 절차 추가 (alembic·seed·서버기동·CLAUDE.md 최신화) | skills/backend-feature, skills/modak-feature-orchestrator | 기능 완료 후 반영 누락 방지 |
| 2026-06-25 | 백엔드 포트 8001, 프론트 포트 3001로 확정 | CLAUDE.md Commands | 로컬 실행 포트 실제값 반영 |

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
- **HTTP 400 vs 401:** 비밀번호 오류·30일 변경 제한 등 "로그인 후 사용자 실수" 에러는 반드시 **400** 반환. 401을 쓰면 axios 인터셉터가 `/login`으로 강제 리다이렉트해 모달/인라인 에러 표시가 불가능.
- **닉네임 vs username 분리:** `nickname`은 표시용(마이페이지 수정 가능), `username`은 인증 식별자(JWT sub, 변경 불가). 응답 shape에서 display는 `author_nickname`/`sender_nickname` 등, 식별은 `author`/`sender`(=username) 유지. 프론트 display: `nickname ?? username` fallback.
- **DELETE + JSON body:** axios에서 `apiClient.delete(url, { data: {...} })` 패턴 사용 (body를 `data` 키에 넣음). `moderationApi.unban`, `usersApi.deleteMe` 동일 패턴 — 검증된 방식.
- **사용자 통계 확장:** 새 사용자 통계는 `GET /api/v1/users/me/stats` 응답(`UserStatsResponse`)에 필드 추가로 확장. 별도 stats 엔드포인트 신설 지양.
