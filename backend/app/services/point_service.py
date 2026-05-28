import uuid

from app.models.point import PointReason
from app.models.vote import VoteType
from app.repository.point_repository import PointRepository

POST_VOTE_UP_POINTS = 10
POST_VOTE_DOWN_POINTS = -5
POST_MAX_POINTS = 1000
POST_MIN_POINTS = -500

COMMENT_VOTE_UP_POINTS = 3
COMMENT_VOTE_DOWN_POINTS = -1
COMMENT_MAX_POINTS = 100
COMMENT_MIN_POINTS = -50

POST_CREATED_POINTS = 3
COMMENT_CREATED_POINTS = 1
DAILY_POST_CREATE_LIMIT = 5
DAILY_COMMENT_CREATE_LIMIT = 5
ATTENDANCE_POINTS = 20


class PointService:
    def __init__(self, point_repo: PointRepository) -> None:
        self.repo = point_repo

    async def award_post_vote(
        self,
        vote_id: uuid.UUID,
        author_id: uuid.UUID,
        post_id: uuid.UUID,
        vote_type: VoteType,
    ) -> int:
        """게시글 추천/비추천 포인트 지급. 실제 지급된 포인트 반환."""
        current_total = await self.repo.sum_post_vote_points(author_id, post_id)

        if vote_type == VoteType.UP:
            amount = POST_VOTE_UP_POINTS
            reason = PointReason.POST_UPVOTE_RECEIVED
            # 최대 +1000 캡
            if current_total >= POST_MAX_POINTS:
                return 0
            if current_total + amount > POST_MAX_POINTS:
                amount = POST_MAX_POINTS - current_total
        else:
            amount = POST_VOTE_DOWN_POINTS
            reason = PointReason.POST_DOWNVOTE_RECEIVED
            # 최소 -500 캡
            if current_total <= POST_MIN_POINTS:
                return 0
            if current_total + amount < POST_MIN_POINTS:
                amount = POST_MIN_POINTS - current_total

        if amount == 0:
            return 0

        await self.repo.add_transaction(
            user_id=author_id,
            amount=amount,
            reason=reason,
            reference_vote_id=vote_id,
            reference_post_id=post_id,
        )
        return amount

    async def award_comment_vote(
        self,
        vote_id: uuid.UUID,
        author_id: uuid.UUID,
        comment_id: uuid.UUID,
        post_id: uuid.UUID,
        vote_type: VoteType,
    ) -> int:
        current_total = await self.repo.sum_comment_vote_points(author_id, comment_id)

        if vote_type == VoteType.UP:
            amount = COMMENT_VOTE_UP_POINTS
            reason = PointReason.COMMENT_UPVOTE_RECEIVED
            if current_total >= COMMENT_MAX_POINTS:
                return 0
            if current_total + amount > COMMENT_MAX_POINTS:
                amount = COMMENT_MAX_POINTS - current_total
        else:
            amount = COMMENT_VOTE_DOWN_POINTS
            reason = PointReason.COMMENT_DOWNVOTE_RECEIVED
            if current_total <= COMMENT_MIN_POINTS:
                return 0
            if current_total + amount < COMMENT_MIN_POINTS:
                amount = COMMENT_MIN_POINTS - current_total

        if amount == 0:
            return 0

        await self.repo.add_transaction(
            user_id=author_id,
            amount=amount,
            reason=reason,
            reference_vote_id=vote_id,
            reference_comment_id=comment_id,
            reference_post_id=post_id,
        )
        return amount

    async def reverse_vote_points(self, vote_id: uuid.UUID, author_id: uuid.UUID) -> None:
        """투표 취소/변경 시 기존 포인트 역산"""
        transactions = await self.repo.get_transactions_by_vote(vote_id)
        for tx in transactions:
            if tx.amount != 0:
                await self.repo.add_transaction(
                    user_id=author_id,
                    amount=-tx.amount,
                    reason=tx.reason,
                    reference_vote_id=vote_id,
                    reference_post_id=tx.reference_post_id,
                    reference_comment_id=tx.reference_comment_id,
                )

    async def award_post_created(self, user_id: uuid.UUID, post_id: uuid.UUID) -> int:
        count = await self.repo.count_today_post_created(user_id)
        if count >= DAILY_POST_CREATE_LIMIT:
            return 0
        await self.repo.add_transaction(
            user_id=user_id,
            amount=POST_CREATED_POINTS,
            reason=PointReason.POST_CREATED,
            reference_post_id=post_id,
        )
        return POST_CREATED_POINTS

    async def award_comment_created(self, user_id: uuid.UUID, post_id: uuid.UUID) -> int:
        count = await self.repo.count_today_comment_created(user_id)
        if count >= DAILY_COMMENT_CREATE_LIMIT:
            return 0
        await self.repo.add_transaction(
            user_id=user_id,
            amount=COMMENT_CREATED_POINTS,
            reason=PointReason.COMMENT_CREATED,
            reference_post_id=post_id,
        )
        return COMMENT_CREATED_POINTS
