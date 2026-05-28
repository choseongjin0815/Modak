import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moderator_ban import ModeratorBan
from app.models.user import User


class ModeratorBanRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def ban(
        self,
        banned_user_id: uuid.UUID,
        banned_by_id: uuid.UUID,
        category_id: int,
        expires_at: datetime | None,
    ) -> ModeratorBan:
        # 기존 차단 먼저 제거
        await self.db.execute(
            delete(ModeratorBan).where(
                ModeratorBan.banned_user_id == banned_user_id,
                ModeratorBan.category_id == category_id,
            )
        )
        ban = ModeratorBan(
            banned_user_id=banned_user_id,
            banned_by_id=banned_by_id,
            category_id=category_id,
            expires_at=expires_at,
        )
        self.db.add(ban)
        await self.db.commit()
        await self.db.refresh(ban)
        return ban

    async def unban(self, banned_user_id: uuid.UUID, category_id: int) -> bool:
        result = await self.db.execute(
            delete(ModeratorBan).where(
                ModeratorBan.banned_user_id == banned_user_id,
                ModeratorBan.category_id == category_id,
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def is_banned(self, user_id: uuid.UUID, category_id: int | None) -> bool:
        if category_id is None:
            return False
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(ModeratorBan).where(
                ModeratorBan.banned_user_id == user_id,
                ModeratorBan.category_id == category_id,
                (ModeratorBan.expires_at.is_(None)) | (ModeratorBan.expires_at > now),
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_bans_by_category(self, category_id: int) -> list:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(ModeratorBan, User.username.label("banned_username"))
            .join(User, ModeratorBan.banned_user_id == User.id)
            .where(
                ModeratorBan.category_id == category_id,
                (ModeratorBan.expires_at.is_(None)) | (ModeratorBan.expires_at > now),
            )
            .order_by(ModeratorBan.created_at.desc())
        )
        return result.all()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_moderator_ban_repo(db: AsyncSession = Depends(get_db)) -> "ModeratorBanRepository":
    return ModeratorBanRepository(db)
