# 방문자 집계

**모델:** `Visit` — `visitor_key`(string), `created_at`(datetime). unique 제약 없음 — 기록마다 행 추가.

## visitor_key 규칙

- 로그인 유저: `user:{username}` — IP가 같아도 계정 단위로 별도 집계
- 비로그인: `anon:{UUID}` — 브라우저 `localStorage.modak_visitor_id`에 저장, 최초 방문 시 생성

## 카운트 규칙 (`VisitorCount` 컴포넌트)

1. **즉시 기록:** `sessionStorage`의 키(`modak_visit_counted`)와 현재 `visitor_key`가 다를 때만 즉시 +1 (같으면 새로고침·중복 방지). Strict Mode 이중 실행도 이 방식으로 방지.
2. **heartbeat:** 이후 10분마다 세션 체크 없이 무조건 +1 (체류 시간 누적).
3. **계정 전환:** `auth-change` 이벤트 → `visitor_key` 재계산 → sessionStorage 키 다르면 즉시 +1 → 타이머 재시작.

**개발 환경:** `HEARTBEAT_INTERVAL`이 30초로 단축 (`process.env.NODE_ENV === 'development'`).

## API

- `POST /api/v1/visits` — `{ visitor_key }` body
- `GET /api/v1/visits/stats` — `{ today, total }` (`today` = `DATE(created_at) = 오늘`)

**프론트:** `VisitorCount` 컴포넌트 → `app/layout.tsx` footer. `auth-change` 이벤트 구독.
