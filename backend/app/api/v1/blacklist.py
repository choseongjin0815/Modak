import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.blacklist_repository import BlacklistRepository, get_blacklist_repo
from app.repository.user_repository import UserRepository, get_user_repo

router = APIRouter(prefix="/blacklist", tags=["blacklist"])


@router.post("/{user_id}")
async def add_to_blacklist(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    blacklist_repo: BlacklistRepository = Depends(get_blacklist_repo),
    user_repo: UserRepository = Depends(get_user_repo),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신을 차단할 수 없습니다")
    target = await user_repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다")
    existing = await blacklist_repo.get(current_user.id, user_id)
    if existing:
        raise HTTPException(status_code=409, detail="이미 차단된 유저입니다")
    await blacklist_repo.create(current_user.id, user_id)
    return {"blocked": True, "blocked_username": target.username}


@router.delete("/{user_id}")
async def remove_from_blacklist(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    blacklist_repo: BlacklistRepository = Depends(get_blacklist_repo),
):
    existing = await blacklist_repo.get(current_user.id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="차단 목록에 없는 유저입니다")
    await blacklist_repo.delete(existing)
    return {"blocked": False}


@router.get("")
async def get_my_blacklist(
    current_user: User = Depends(get_current_active_user),
    blacklist_repo: BlacklistRepository = Depends(get_blacklist_repo),
):
    items = await blacklist_repo.get_my_blacklist(current_user.id)
    return {"items": items}
