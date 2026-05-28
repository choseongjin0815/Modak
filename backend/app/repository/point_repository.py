import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.point import PointReason, PointTransaction
from app.models.user import User


class PointRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add_transaction(
        self,
        user_id: uuid.UUID,
        amount: int,
        reason: PointReason,
        reference_vote_id: uuid.UUID | None = None,
        reference_post_id: uuid.UUID | None = None,
        reference_comment_id: uuid.UUID | None = None,
    ) -> PointTransaction:
        tx = PointTransaction(
            user_id=user_id,
            amount=amount,
            reason=reason,
            reference_vote_id=reference_vote_id,
            reference_post_id=reference_post_id,
            reference_comment_id=reference_comment_id,
        )
        self.db.add(tx)
        # Update user points
        await self.db.execute(
            update(User).where(User.id == user_id).values(points=User.points + amount),
            execution_options={"synchronize_session": False},
        )
        await self.db.commit()
        return tx

    async def get_transactions_by_vote(self, vote_id: uuid.UUID) -> list[PointTransaction]:
        result = await self.db.execute(
            select(PointTransaction).where(PointTransaction.reference_vote_id == vote_id)
        )
        return list(result.scalars().all())

    async def get_user_transactions(self, user_id: uuid.UUID, limit: int = 50) -> list[PointTransaction]:
        result = await self.db.execute(
            select(PointTransaction)
            .where(PointTransaction.user_id == user_id)
            .order_by(PointTransaction.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def sum_post_vote_points(self, author_id: uuid.UUID, post_id: uuid.UUID) -> int:
        """특정 게시글의 추천/비추천으로 author가 받은 총 포인트 합계"""
        result = await self.db.execute(
            select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
                PointTransaction.user_id == author_id,
                PointTransaction.reference_post_id == post_id,
                PointTransaction.reason.in_([
                    PointReason.POST_UPVOTE_RECEIVED,
                    PointReason.POST_DOWNVOTE_RECEIVED,
                ]),
            )
        )
        return result.scalar_one()

    async def sum_comment_vote_points(self, author_id: uuid.UUID, comment_id: uuid.UUID) -> int:
        """특정 댓글의 추천/비추천으로 author가 받은 총 포인트 합계"""
        result = await self.db.execute(
            select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
                PointTransaction.user_id == author_id,
                PointTransaction.reference_comment_id == comment_id,
                PointTransaction.reason.in_([
                    PointReason.COMMENT_UPVOTE_RECEIVED,
                    PointReason.COMMENT_DOWNVOTE_RECEIVED,
                ]),
            )
        )
        return result.scalar_one()

    async def count_today_post_created(self, user_id: uuid.UUID) -> int:
        today = date.today()
        result = await self.db.execute(
            select(func.count(PointTransaction.id)).where(
                PointTransaction.user_id == user_id,
                PointTransaction.reason == PointReason.POST_CREATED,
                func.date(PointTransaction.created_at) == today,
            )
        )
        return result.scalar_one()

    async def count_today_comment_created(self, user_id: uuid.UUID) -> int:
        today = date.today()
        result = await self.db.execute(
            select(func.count(PointTransaction.id)).where(
                PointTransaction.user_id == user_id,
                PointTransaction.reason == PointReason.COMMENT_CREATED,
                func.date(PointTransaction.created_at) == today,
            )
        )
        return result.scalar_one()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_point_repo(db: AsyncSession = Depends(get_db)) -> "PointRepository":
    return PointRepository(db)
