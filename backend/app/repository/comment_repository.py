import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate


class CommentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        comment_in: CommentCreate,
    ) -> Comment:
        comment = Comment(
            content=comment_in.content,
            post_id=post_id,
            user_id=user_id,
        )
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return await self.get_by_id(comment.id)

    async def get_by_id(self, comment_id: uuid.UUID) -> Comment | None:
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_post_id(self, post_id: uuid.UUID) -> list[Comment]:
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.post_id == post_id)
            .order_by(Comment.created_at.asc())
        )
        return list(result.scalars().all())

    async def update(self, comment: Comment, comment_in: CommentUpdate) -> Comment:
        comment.content = comment_in.content
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return await self.get_by_id(comment.id)

    async def delete(self, comment: Comment) -> None:
        await self.db.delete(comment)
        await self.db.commit()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_comment_repo(db: AsyncSession = Depends(get_db)) -> "CommentRepository":
    return CommentRepository(db)
