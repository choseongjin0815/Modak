import math
import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notice import Notice
from app.schemas.notice import NoticeCreate


class NoticeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, notice_in: NoticeCreate, author_id: uuid.UUID) -> Notice:
        notice = Notice(
            title=notice_in.title,
            content=notice_in.content,
            is_pinned=notice_in.is_pinned,
            author_id=author_id,
        )
        self.db.add(notice)
        await self.db.commit()
        await self.db.refresh(notice)
        return notice

    async def get_by_id(self, notice_id: uuid.UUID) -> Notice | None:
        result = await self.db.execute(
            select(Notice)
            .options(selectinload(Notice.author))
            .where(Notice.id == notice_id)
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        search: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> dict:
        query = select(Notice).options(selectinload(Notice.author))
        if search:
            query = query.where(
                Notice.title.ilike(f"%{search}%") | Notice.content.ilike(f"%{search}%")
            )
        # 고정 공지 우선, 그 안에서 최신순
        query = query.order_by(Notice.is_pinned.desc(), Notice.created_at.desc())

        total = (
            await self.db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).scalars().all()

        items = [
            {
                "id": n.id,
                "title": n.title,
                "is_pinned": n.is_pinned,
                "view_count": n.view_count,
                "author": n.author.username if n.author else None,
                "created_at": n.created_at,
            }
            for n in rows
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total > 0 else 1,
        }

    async def get_pinned(self, limit: int = 3) -> list[dict]:
        result = await self.db.execute(
            select(Notice)
            .options(selectinload(Notice.author))
            .where(Notice.is_pinned == True)  # noqa: E712
            .order_by(Notice.created_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
        return [
            {
                "id": n.id,
                "title": n.title,
                "is_pinned": n.is_pinned,
                "view_count": n.view_count,
                "author": n.author.username if n.author else None,
                "created_at": n.created_at,
            }
            for n in rows
        ]

    async def update(self, notice: Notice, **fields: Any) -> Notice:
        for k, v in fields.items():
            setattr(notice, k, v)
        self.db.add(notice)
        await self.db.commit()
        await self.db.refresh(notice)
        return notice

    async def delete(self, notice: Notice) -> None:
        await self.db.delete(notice)
        await self.db.commit()

    async def increment_view_count(self, notice_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Notice)
            .where(Notice.id == notice_id)
            .values(view_count=Notice.view_count + 1),
            execution_options={"synchronize_session": False},
        )
        await self.db.commit()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_notice_repo(db: AsyncSession = Depends(get_db)) -> "NoticeRepository":
    return NoticeRepository(db)
