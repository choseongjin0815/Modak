import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.blacklist import Blacklist
from app.models.user import User


class BlacklistRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, blocker_id: uuid.UUID, blocked_id: uuid.UUID) -> Blacklist | None:
        result = await self.db.execute(
            select(Blacklist).where(
                Blacklist.blocker_id == blocker_id,
                Blacklist.blocked_id == blocked_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, blocker_id: uuid.UUID, blocked_id: uuid.UUID) -> Blacklist:
        bl = Blacklist(blocker_id=blocker_id, blocked_id=blocked_id)
        self.db.add(bl)
        await self.db.commit()
        await self.db.refresh(bl)
        return bl

    async def delete(self, bl: Blacklist) -> None:
        await self.db.delete(bl)
        await self.db.commit()

    async def get_blocker_ids(self, blocked_id: uuid.UUID) -> list[uuid.UUID]:
        """current_user를 블랙리스트에 등록한 유저 목록 (내 콘텐츠를 못 보게 된 사람들)"""
        result = await self.db.execute(
            select(Blacklist.blocker_id).where(Blacklist.blocked_id == blocked_id)
        )
        return list(result.scalars().all())

    async def get_blocked_ids(self, blocker_id: uuid.UUID) -> list[uuid.UUID]:
        """내가 블랙리스트에 등록한 유저 목록"""
        result = await self.db.execute(
            select(Blacklist.blocked_id).where(Blacklist.blocker_id == blocker_id)
        )
        return list(result.scalars().all())

    async def get_my_blacklist(self, blocker_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(Blacklist, User.username)
            .join(User, Blacklist.blocked_id == User.id)
            .where(Blacklist.blocker_id == blocker_id)
            .order_by(Blacklist.created_at.desc())
        )
        rows = result.all()
        return [
            {
                "id": str(row.Blacklist.id),
                "blocked_id": str(row.Blacklist.blocked_id),
                "blocked_username": row.username,
                "created_at": row.Blacklist.created_at.isoformat(),
            }
            for row in rows
        ]


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_blacklist_repo(db: AsyncSession = Depends(get_db)) -> "BlacklistRepository":
    return BlacklistRepository(db)
