# 백엔드 아키텍처

`backend/app/` — Python 3.13, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic.

## 레이어

레이어 순서: `api/v1/` → `services/` → `repository/` → `models/`

- **`models/`** — SQLAlchemy ORM. UUID PK(Post·User·Comment·File·ModeratorBan·Message·Notification), Integer PK(Category·CategoryModerator·Visit). Post는 User·Comment·File과 cascade 관계. `Post.category_id`는 FK (SET NULL on delete). `Comment.parent_id`는 자기 참조 FK (CASCADE).
- **`schemas/`** — Pydantic v2. 요청·응답 직렬화 전용.
- **`repository/`** — 순수 async DB 함수. 비즈니스 로직 없음. `post_repository.py`의 `get_list()`가 JOIN으로 author·comment_count·category·is_mod를 한 번에 조회.
- **`services/`** — 비즈니스 로직. `vote_service.py`, `point_service.py`, `attendance_service.py`, `chatbot.py`, `sse_manager.py`.
- **`api/v1/`** — 라우터. 권한 체크(작성자·운영자 여부)는 여기서 처리.
- **`security/dependencies.py`** — `get_current_user` / `get_current_active_user` / `get_optional_user` 의존성. `require_role(UserRole.ADMIN)` 데코레이터로 관리자 권한 체크.
- **`security/jwt.py`** — JWT 생성·검증, **`security/password.py`** — bcrypt.

## 인증

- OAuth2PasswordBearer. JWT `sub` 필드 = **username** (user_id가 아님).
- **로그인 잠금:** 5회 실패 시 1일 잠금. `User.failed_login_attempts` + `User.locked_until` 컬럼. `user_repository.authenticate()`에서 처리. 잠긴 경우 HTTP 423 반환.

## 세션 / DB

- `database.py`의 세션은 **`expire_on_commit=False`** — commit 후에도 이미 로드된 ORM 관계 접근이 안전.
- **MissingGreenlet 주의:** 그래도 commit 후 *만료된* 속성을 동기 컨텍스트에서 lazy load하면 `MissingGreenlet` 오류가 난다. DB 쿼리(`is_moderator()` 등)는 `increment_view_count()`(commit 포함) **이전**에 모아 호출하는 패턴을 유지할 것.

## 기타

- **파일 업로드:** `uploads/` 디렉토리에 `{uuid}{ext}` 저장. 다운로드는 `GET /api/v1/files/{file_id}`.
- **lifespan:** `main.py`의 `@asynccontextmanager lifespan`에서 서버 시작 시 `ChatbotService.initialize()` 1회 실행.
- **CORS:** `http://localhost:3000`만 허용. 프로덕션 배포 시 `app/main.py`의 `allow_origins` 수정.
- **bcrypt 버전:** `requirements.txt`에 `bcrypt==4.0.1` 고정 필수. passlib 1.7.4는 bcrypt 4.1+ 비호환.

## API 공통 규약

- **페이지네이션:** 기본 `page=1, size=20`. 응답: `{ items, total, page, size, pages }`.
- **검색:** 제목·내용 동시 `ilike` 검색. `sort_by`: `created_at` | `view_count` | `net_votes`.
- **날짜:** DB는 `timezone=True` DateTime. 프론트는 `date-fns`로 포맷.
- **모델 ID:** Python `uuid.UUID` → API 응답에서 문자열로 직렬화.
- **인기글 기준:** `post_repository.HOT_THRESHOLD = 100`. 이 상수 하나만 바꾸면 필터링·`is_hot` 계산·프론트 표시(`PostListResult.hot_threshold`)가 모두 반영.

## seed.py

- 실행: PowerShell에서 `$env:PYTHONIOENCODING="utf-8"` 설정 필수 (이모지 인코딩 오류 방지).
- 기존 데이터 자동 TRUNCATE 후 재삽입. **새 테이블 추가 시 `seed.py`의 TRUNCATE 목록에도 반드시 추가.**
- admin / Admin1234! + user01~user100 / Test1234! + 게시글 20,000개 생성.
