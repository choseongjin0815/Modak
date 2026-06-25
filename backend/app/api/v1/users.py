from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.security.dependencies import get_current_active_user
from app.security.password import verify_password
from app.models.user import User
from app.repository.category_moderator_repository import CategoryModeratorRepository, get_category_mod_repo
from app.repository.user_repository import UserRepository, get_user_repo
from app.schemas.user import UserDeleteRequest, UserResponse, UserStatsResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

NICKNAME_CHANGE_INTERVAL = timedelta(days=30)
NICKNAME_MIN_LEN = 2
NICKNAME_MAX_LEN = 20


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_my_stats(
    current_user: User = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repo),
):
    return await user_repo.get_my_stats(current_user.id)


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repo),
):
    # 비밀번호 변경 요청 시 현재 비밀번호 검증
    if user_in.new_password:
        if not user_in.current_password:
            raise HTTPException(status_code=400, detail="현재 비밀번호를 입력해주세요")
        if not verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")

    # 유저명 중복 체크
    if user_in.username and user_in.username != current_user.username:
        existing = await user_repo.get_by_username(user_in.username)
        if existing:
            raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다")

    # 이메일 중복 체크
    if user_in.email and user_in.email != current_user.email:
        existing = await user_repo.get_by_email(user_in.email)
        if existing:
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다")

    # 닉네임 변경 처리 (모든 조회/검증을 update_profile 의 commit 이전에 수행 — MissingGreenlet 회피)
    nickname: str | None = None
    nickname_changed_at: datetime | None = None
    if user_in.nickname is not None and user_in.nickname != current_user.nickname:
        new_nickname = user_in.nickname.strip()

        # 형식 검증
        if not (NICKNAME_MIN_LEN <= len(new_nickname) <= NICKNAME_MAX_LEN):
            raise HTTPException(status_code=400, detail="닉네임은 2~20자로 입력해주세요")

        # 30일 제한 (nickname_changed_at IS NULL = 가입 후 미변경 → 제한 없이 허용)
        now = datetime.now(timezone.utc)
        if current_user.nickname_changed_at is not None:
            next_available = current_user.nickname_changed_at + NICKNAME_CHANGE_INTERVAL
            if now < next_available:
                date_str = next_available.strftime("%Y년 %m월 %d일")
                raise HTTPException(
                    status_code=400,
                    detail=f"닉네임은 30일에 한 번만 변경할 수 있습니다. {date_str} 이후 변경 가능합니다.",
                )

        # 중복 체크 (본인 제외)
        existing = await user_repo.get_by_nickname(new_nickname)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다")

        nickname = new_nickname
        nickname_changed_at = now

    return await user_repo.update_profile(
        current_user,
        username=user_in.username,
        email=user_in.email,
        new_password=user_in.new_password,
        nickname=nickname,
        nickname_changed_at=nickname_changed_at,
    )


@router.delete("/me")
async def delete_my_account(
    payload: UserDeleteRequest,
    current_user: User = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repo),
):
    # 비밀번호 재확인 — 실패 시 400 (401 금지: axios 인터셉터 로그인 리다이렉트 충돌 회피)
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="비밀번호가 올바르지 않습니다")
    # 하드 삭제. 연관 데이터는 DB CASCADE/SET NULL이 처리.
    await user_repo.delete(current_user)
    return {"message": "회원 탈퇴가 완료되었습니다"}


@router.get("/me/posts")
async def get_my_posts(
    page: int = Query(1, ge=1),
    size: int = Query(8, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repo),
):
    posts, total, pages = await user_repo.get_my_posts(current_user.id, page=page, size=size)
    items = [
        {
            "id": str(p.id),
            "title": p.title,
            "category": {"id": p.category.id, "slug": p.category.slug, "name": p.category.name, "group": p.category.group} if p.category else None,
            "view_count": p.view_count,
            "up_votes": p.up_votes,
            "down_votes": p.down_votes,
            "net_votes": p.up_votes - p.down_votes,
            "created_at": p.created_at.isoformat(),
        }
        for p in posts
    ]
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/me/moderated-categories")
async def get_my_moderated_categories(
    current_user: User = Depends(get_current_active_user),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    categories = await cat_mod_repo.get_categories_for_user(current_user.id)
    return [
        {"id": c.id, "slug": c.slug, "name": c.name, "group": c.group}
        for c in categories
    ]
