# 운영자(Moderator) 시스템

카테고리별 운영자. ADMIN이 `/admin/moderators`에서 지정·해제.

## 모델

- `CategoryModerator` — `(user_id, category_id)` unique 쌍. 한 유저가 여러 카테고리 운영 가능.
- `ModeratorBan` — 운영자가 특정 카테고리에서 유저를 기간 차단. `expires_at = NULL`이면 영구.

## Repository

- `CategoryModeratorRepository` — `is_moderator()`, `get_mod_user_ids_for_category()`, `get_categories_for_user()`
- `ModeratorBanRepository` — `is_banned()`, `ban()`, `unban()`, `get_bans_by_category()`

## 운영자 권한

- 자신이 운영하는 카테고리의 게시글·댓글 soft delete (`by_admin=True`)
- 해당 카테고리에서 유저 기간 차단 (1h/6h/24h/7d/30d/영구)
- 차단된 유저는 해당 카테고리 게시글·댓글 작성 불가 (HTTP 403)

## API 엔드포인트

- `POST /api/v1/moderation/bans` — 차단
- `DELETE /api/v1/moderation/bans` — 차단 해제
- `GET /api/v1/moderation/bans/{category_id}` — 카테고리 차단 목록
- `GET /api/v1/users/me/moderated-categories` — 내 운영 게시판 목록
- `GET /api/v1/admin/moderators` — 전체 운영자 목록 (ADMIN 전용)
- `POST /api/v1/admin/moderators` — 운영자 지정 (ADMIN 전용)
- `DELETE /api/v1/admin/moderators/{user_id}/{category_id}` — 운영자 해제 (ADMIN 전용)

## 응답 필드 (PostResponse / PostListItem / CommentResponse)

- `author_role: str` — "USER" | "ADMIN"
- `author_is_mod: bool` — 작성자가 해당 카테고리 운영자 여부
- `viewer_is_mod: bool` — 현재 요청자가 해당 카테고리 운영자 여부 (PostResponse만, `/posts/{id}/detail` 엔드포인트)

## 주의

`is_moderator()` 등 DB 쿼리는 반드시 `increment_view_count()`(commit 포함) **이전**에 호출. 자세한 이유는 [backend.md](backend.md)의 MissingGreenlet 항목 참고.
