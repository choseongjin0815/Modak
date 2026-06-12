# 댓글 시스템

## 대댓글

- `Comment.parent_id` — 자기 참조 FK (CASCADE). **1단계 깊이만 지원** — 대댓글에 답글 불가 (API에서 400 반환).
- 백엔드는 flat list 반환, 프론트(`CommentList`)에서 `parent_id` 기준으로 중첩 구조 조직.
- `CommentResponse.parent_id` 포함. `CommentCreate.parent_id`는 optional string (UUID).

## 알림 자동 발송

댓글 생성 시 ([messaging-notifications.md](messaging-notifications.md) 참고):
- 게시글 작성자에게 `post_comment` 알림
- 부모 댓글 작성자에게 `comment_reply` 알림 (본인 댓글 제외, 중복 제외)
