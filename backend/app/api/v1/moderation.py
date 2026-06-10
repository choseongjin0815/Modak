import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.category_moderator_repository import CategoryModeratorRepository, get_category_mod_repo
from app.repository.moderator_ban_repository import ModeratorBanRepository, get_moderator_ban_repo

router = APIRouter(prefix="/moderation", tags=["moderation"])
logger = logging.getLogger(__name__)

DURATION_MAP: dict[str, timedelta | None] = {
    "1h":        timedelta(hours=1),
    "6h":        timedelta(hours=6),
    "24h":       timedelta(hours=24),
    "7d":        timedelta(days=7),
    "30d":       timedelta(days=30),
    "permanent": None,
}


class BanRequest(BaseModel):
    user_id: str
    category_id: int
    duration: str


class UnbanRequest(BaseModel):
    user_id: str
    category_id: int


@router.post("/bans", status_code=201)
async def ban_user(
    body: BanRequest,
    current_user: User = Depends(get_current_active_user),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    ban_repo: ModeratorBanRepository = Depends(get_moderator_ban_repo),
):
    if body.duration not in DURATION_MAP:
        raise HTTPException(status_code=400, detail="유효하지 않은 차단 기간입니다")
    if not await cat_mod_repo.is_moderator(current_user.id, body.category_id):
        raise HTTPException(status_code=403, detail="해당 게시판의 운영자가 아닙니다")
    banned_user_id = uuid.UUID(body.user_id)
    if banned_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신을 차단할 수 없습니다")
    duration = DURATION_MAP[body.duration]
    expires_at = datetime.now(timezone.utc) + duration if duration else None
    ban = await ban_repo.ban(
        banned_user_id=banned_user_id,
        banned_by_id=current_user.id,
        category_id=body.category_id,
        expires_at=expires_at,
    )
    logger.info(
        "유저 차단: moderator=%s, banned=%s, category_id=%s, duration=%s",
        current_user.username, body.user_id, body.category_id, body.duration,
    )
    return {"id": str(ban.id), "expires_at": ban.expires_at.isoformat() if ban.expires_at else None}


@router.delete("/bans", status_code=204)
async def unban_user(
    body: UnbanRequest,
    current_user: User = Depends(get_current_active_user),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    ban_repo: ModeratorBanRepository = Depends(get_moderator_ban_repo),
):
    if not await cat_mod_repo.is_moderator(current_user.id, body.category_id):
        raise HTTPException(status_code=403, detail="해당 게시판의 운영자가 아닙니다")
    await ban_repo.unban(uuid.UUID(body.user_id), body.category_id)
    logger.info("유저 차단 해제: moderator=%s, user_id=%s, category_id=%s", current_user.username, body.user_id, body.category_id)


@router.get("/bans/{category_id}")
async def list_bans(
    category_id: int,
    current_user: User = Depends(get_current_active_user),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    ban_repo: ModeratorBanRepository = Depends(get_moderator_ban_repo),
):
    if not await cat_mod_repo.is_moderator(current_user.id, category_id):
        raise HTTPException(status_code=403, detail="해당 게시판의 운영자가 아닙니다")
    rows = await ban_repo.get_bans_by_category(category_id)
    return [
        {
            "banned_user_id": str(row.ModeratorBan.banned_user_id),
            "banned_username": row.banned_username,
            "expires_at": row.ModeratorBan.expires_at.isoformat() if row.ModeratorBan.expires_at else None,
            "created_at": row.ModeratorBan.created_at.isoformat(),
        }
        for row in rows
    ]
