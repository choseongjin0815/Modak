import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bookmark import Bookmark
from app.models.post import Post


class BookmarkRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: uuid.UUID, post_id: uuid.UUID) -> Bookmark | None:
        result = await self.db.execute(
            select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.post_id == post_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID, post_id: uuid.UUID) -> Bookmark:
        bookmark = Bookmark(user_id=user_id, post_id=post_id)
        self.db.add(bookmark)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return bookmark

    async def delete(self, bookmark: Bookmark) -> None:
        await self.db.delete(bookmark)
        await self.db.commit()

    async def get_user_bookmarks(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        """북마크된 post_id 목록 반환"""
        result = await self.db.execute(
            select(Bookmark.post_id).where(Bookmark.user_id == user_id)
        )
        return list(result.scalars().all())


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_bookmark_repo(db: AsyncSession = Depends(get_db)) -> "BookmarkRepository":
    return BookmarkRepository(db)
