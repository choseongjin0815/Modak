import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vote import CommentVote, PostVote, VoteType


class VoteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── PostVote ──────────────────────────────────────────

    async def get_post_vote(self, user_id: uuid.UUID, post_id: uuid.UUID) -> PostVote | None:
        result = await self.db.execute(
            select(PostVote).where(PostVote.user_id == user_id, PostVote.post_id == post_id)
        )
        return result.scalar_one_or_none()

    async def create_post_vote(self, user_id: uuid.UUID, post_id: uuid.UUID, vote_type: VoteType) -> PostVote:
        vote = PostVote(post_id=post_id, user_id=user_id, vote_type=vote_type)
        self.db.add(vote)
        await self.db.commit()
        await self.db.refresh(vote)
        return vote

    async def update_post_vote(self, vote: PostVote, vote_type: VoteType) -> PostVote:
        vote.vote_type = vote_type
        self.db.add(vote)
        await self.db.commit()
        await self.db.refresh(vote)
        return vote

    async def delete_post_vote(self, vote: PostVote) -> None:
        await self.db.delete(vote)
        await self.db.commit()

    async def count_post_votes_in_hour(self, user_id: uuid.UUID) -> int:
        one_hour_ago = datetime.now(UTC) - timedelta(hours=1)
        result = await self.db.execute(
            select(func.count(PostVote.id)).where(
                PostVote.user_id == user_id,
                PostVote.created_at >= one_hour_ago,
            )
        )
        return result.scalar_one()

    # ── CommentVote ───────────────────────────────────────

    async def get_comment_vote(self, user_id: uuid.UUID, comment_id: uuid.UUID) -> CommentVote | None:
        result = await self.db.execute(
            select(CommentVote).where(CommentVote.user_id == user_id, CommentVote.comment_id == comment_id)
        )
        return result.scalar_one_or_none()

    async def create_comment_vote(self, user_id: uuid.UUID, comment_id: uuid.UUID, vote_type: VoteType) -> CommentVote:
        vote = CommentVote(comment_id=comment_id, user_id=user_id, vote_type=vote_type)
        self.db.add(vote)
        await self.db.commit()
        await self.db.refresh(vote)
        return vote

    async def update_comment_vote(self, vote: CommentVote, vote_type: VoteType) -> CommentVote:
        vote.vote_type = vote_type
        self.db.add(vote)
        await self.db.commit()
        await self.db.refresh(vote)
        return vote

    async def delete_comment_vote(self, vote: CommentVote) -> None:
        await self.db.delete(vote)
        await self.db.commit()

    async def count_comment_votes_in_hour(self, user_id: uuid.UUID) -> int:
        one_hour_ago = datetime.now(UTC) - timedelta(hours=1)
        result = await self.db.execute(
            select(func.count(CommentVote.id)).where(
                CommentVote.user_id == user_id,
                CommentVote.created_at >= one_hour_ago,
            )
        )
        return result.scalar_one()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_vote_repo(db: AsyncSession = Depends(get_db)) -> "VoteRepository":
    return VoteRepository(db)
