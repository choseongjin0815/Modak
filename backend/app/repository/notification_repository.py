import logging
import math
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.services.sse_manager import sse_manager

logger = logging.getLogger(__name__)


class NotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        type: str,
        actor: str,
        content: str,
        link: str | None = None,
    ) -> Notification:
        noti = Notification(user_id=user_id, type=type, actor=actor, content=content, link=link)
        self.db.add(noti)
        await self.db.commit()
        await self.db.refresh(noti)
        await sse_manager.push(user_id, {
            "id": str(noti.id),
            "type": noti.type,
            "actor": noti.actor,
            "content": noti.content,
            "link": noti.link,
            "is_read": False,
            "created_at": noti.created_at.isoformat(),
        })
        logger.info("알림 생성: type=%s, actor=%s → user_id=%s", type, actor, user_id)
        return noti

    async def get_list(self, user_id: uuid.UUID, page: int = 1, size: int = 20):
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).scalars().all()
        return list(rows), total, math.ceil(total / size) if total > 0 else 1

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        )
        return result.scalar_one()

    async def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .values(is_read=True)
        )
        await self.db.commit()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_notification_repo(db: AsyncSession = Depends(get_db)) -> "NotificationRepository":
    return NotificationRepository(db)
