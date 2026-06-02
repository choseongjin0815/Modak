import math
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.message import Message
from app.models.user import User


class MessageRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def send(self, sender_id: uuid.UUID, receiver_id: uuid.UUID, content: str) -> Message:
        msg = Message(sender_id=sender_id, receiver_id=receiver_id, content=content)
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return await self.get_by_id(msg.id)

    async def get_by_id(self, message_id: uuid.UUID) -> Message | None:
        result = await self.db.execute(
            select(Message)
            .options(selectinload(Message.sender), selectinload(Message.receiver))
            .where(Message.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_inbox(self, user_id: uuid.UUID, page: int = 1, size: int = 20):
        query = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.receiver_id == user_id, Message.deleted_by_receiver == False)  # noqa: E712
            .order_by(Message.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await self.db.execute(query.offset((page - 1) * size).limit(size))).scalars().all()
        return list(rows), total, math.ceil(total / size) if total > 0 else 1

    async def get_sent(self, user_id: uuid.UUID, page: int = 1, size: int = 20):
        query = (
            select(Message)
            .options(selectinload(Message.receiver))
            .where(Message.sender_id == user_id, Message.deleted_by_sender == False)  # noqa: E712
            .order_by(Message.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        rows = (await self.db.execute(query.offset((page - 1) * size).limit(size))).scalars().all()
        return list(rows), total, math.ceil(total / size) if total > 0 else 1

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Message.receiver_id == user_id,
                Message.is_read == False,  # noqa: E712
                Message.deleted_by_receiver == False,  # noqa: E712
            )
        )
        return result.scalar_one()

    async def mark_read(self, message_id: uuid.UUID, receiver_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Message)
            .where(Message.id == message_id, Message.receiver_id == receiver_id)
            .values(is_read=True)
        )
        await self.db.commit()

    async def delete_for_user(self, message_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        msg = await self.get_by_id(message_id)
        if not msg:
            return False
        if msg.sender_id == user_id:
            msg.deleted_by_sender = True
        elif msg.receiver_id == user_id:
            msg.deleted_by_receiver = True
        else:
            return False
        self.db.add(msg)
        await self.db.commit()
        return True


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_message_repo(db: AsyncSession = Depends(get_db)) -> "MessageRepository":
    return MessageRepository(db)
