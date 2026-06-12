# 쪽지 & 알림(SSE)

## 쪽지 시스템

**모델:** `Message` — sender_id, receiver_id, content, is_read, deleted_by_sender, deleted_by_receiver. 양쪽 독립 삭제 지원.

**API:**
- `POST /api/v1/messages` — 발송 (receiver_username으로 지정). 발송 시 수신자에게 `new_message` 알림 자동 생성.
- `GET /api/v1/messages/inbox` — 받은 쪽지함
- `GET /api/v1/messages/sent` — 보낸 쪽지함
- `GET /api/v1/messages/unread-count` — 미읽음 수
- `PATCH /api/v1/messages/{id}/read` — 읽음 처리
- `DELETE /api/v1/messages/{id}` — 삭제 (본인 side만)

## 알림 시스템 (SSE)

**모델:** `Notification` — user_id, type(`post_comment`|`comment_reply`|`new_message`), actor(username), content, link, is_read.

**실시간 전달 흐름:**
1. `notification_repository.create()` → DB 저장 → `sse_manager.push(user_id, data)` → 해당 유저의 `asyncio.Queue`에 추가
2. `GET /api/v1/notifications/stream?token=...` — SSE 스트림. `queue.get()` 대기 → 이벤트 도착 즉시 `event: notification` 전송. 25초마다 `event: ping` (연결 유지).
3. 프론트 `EventSource` → `notification` 이벤트 수신 → 뱃지 +1, 드롭다운 목록 prepend.

**SSE 인증:** EventSource는 커스텀 헤더 미지원 → 토큰을 쿼리 파라미터로 전달 (`?token=...`).

**SSEManager (`services/sse_manager.py`):** 유저별 `list[asyncio.Queue]` 관리 (멀티탭 지원). 싱글톤 인스턴스 `sse_manager`.

**재연결:** 연결 끊기면 프론트에서 5초 후 자동 재연결. `auth-change` 이벤트 시 SSE 재연결/해제. (`NotificationBell`의 `reconnectRef`로 타이머 추적 → 언마운트 시 취소)

**알림 발생 항목:**
- `post_comment` — 내 게시글에 댓글
- `comment_reply` — 내 댓글에 답글
- `new_message` — 쪽지 수신

**API:**
- `GET /api/v1/notifications/stream?token=...` — SSE 스트림 (인증: 쿼리 파라미터)
- `GET /api/v1/notifications` — 알림 목록
- `GET /api/v1/notifications/unread-count` — 미읽음 수
- `PATCH /api/v1/notifications/{id}/read` — 읽음 처리
- `PATCH /api/v1/notifications/read-all` — 전체 읽음
