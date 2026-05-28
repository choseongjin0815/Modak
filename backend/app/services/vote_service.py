import uuid

from fastapi import HTTPException

from app.models.vote import VoteType
from app.repository.bookmark_repository import BookmarkRepository
from app.repository.comment_repository import CommentRepository
from app.repository.point_repository import PointRepository
from app.repository.post_repository import PostRepository
from app.repository.vote_repository import VoteRepository
from app.schemas.vote import VoteResult
from app.services.point_service import PointService

POST_VOTE_HOUR_LIMIT = 10
COMMENT_VOTE_HOUR_LIMIT = 15


class VoteService:
    def __init__(
        self,
        vote_repo: VoteRepository,
        post_repo: PostRepository,
        comment_repo: CommentRepository,
        point_service: PointService,
    ) -> None:
        self.vote_repo = vote_repo
        self.post_repo = post_repo
        self.comment_repo = comment_repo
        self.point_service = point_service

    async def vote_post(self, voter_id: uuid.UUID, post_id: uuid.UUID, vote_type: VoteType) -> VoteResult:
        post = await self.post_repo.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
        if post.user_id == voter_id:
            raise HTTPException(status_code=400, detail="자신의 게시글에는 투표할 수 없습니다")

        existing = await self.vote_repo.get_post_vote(voter_id, post_id)

        if existing:
            if existing.vote_type == vote_type:
                # 같은 방향 재클릭 → 취소
                await self.point_service.reverse_vote_points(existing.id, post.user_id)
                await self.vote_repo.delete_post_vote(existing)
                delta = (-1, 0) if vote_type == VoteType.UP else (0, -1)
                await self.post_repo.update_vote_counts(post_id, up_delta=delta[0], down_delta=delta[1])
                post = await self.post_repo.get_by_id(post_id)
                return VoteResult(action="removed", vote_type=None, up_votes=post.up_votes, down_votes=post.down_votes, net_votes=post.up_votes - post.down_votes)
            else:
                # 방향 전환
                await self.point_service.reverse_vote_points(existing.id, post.user_id)
                old_type = existing.vote_type
                updated_vote = await self.vote_repo.update_post_vote(existing, vote_type)
                await self.point_service.award_post_vote(updated_vote.id, post.user_id, post_id, vote_type)
                if old_type == VoteType.UP:
                    await self.post_repo.update_vote_counts(post_id, up_delta=-1, down_delta=1)
                else:
                    await self.post_repo.update_vote_counts(post_id, up_delta=1, down_delta=-1)
                post = await self.post_repo.get_by_id(post_id)
                return VoteResult(action="changed", vote_type=vote_type.value, up_votes=post.up_votes, down_votes=post.down_votes, net_votes=post.up_votes - post.down_votes)
        else:
            # 신규 투표 - 시간당 제한 확인
            recent = await self.vote_repo.count_post_votes_in_hour(voter_id)
            if recent >= POST_VOTE_HOUR_LIMIT:
                raise HTTPException(status_code=429, detail="시간당 게시글 투표는 10회까지 가능합니다")
            vote = await self.vote_repo.create_post_vote(voter_id, post_id, vote_type)
            await self.point_service.award_post_vote(vote.id, post.user_id, post_id, vote_type)
            if vote_type == VoteType.UP:
                await self.post_repo.update_vote_counts(post_id, up_delta=1)
            else:
                await self.post_repo.update_vote_counts(post_id, down_delta=1)
            post = await self.post_repo.get_by_id(post_id)
            return VoteResult(action="added", vote_type=vote_type.value, up_votes=post.up_votes, down_votes=post.down_votes, net_votes=post.up_votes - post.down_votes)

    async def vote_comment(self, voter_id: uuid.UUID, comment_id: uuid.UUID, vote_type: VoteType) -> VoteResult:
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
        if comment.user_id == voter_id:
            raise HTTPException(status_code=400, detail="자신의 댓글에는 투표할 수 없습니다")

        existing = await self.vote_repo.get_comment_vote(voter_id, comment_id)

        if existing:
            if existing.vote_type == vote_type:
                await self.point_service.reverse_vote_points(existing.id, comment.user_id)
                await self.vote_repo.delete_comment_vote(existing)
                delta = (-1, 0) if vote_type == VoteType.UP else (0, -1)
                await self.post_repo.update_comment_vote_counts(comment_id, up_delta=delta[0], down_delta=delta[1])
                comment = await self.comment_repo.get_by_id(comment_id)
                return VoteResult(action="removed", vote_type=None, up_votes=comment.up_votes, down_votes=comment.down_votes, net_votes=comment.up_votes - comment.down_votes)
            else:
                await self.point_service.reverse_vote_points(existing.id, comment.user_id)
                old_type = existing.vote_type
                updated_vote = await self.vote_repo.update_comment_vote(existing, vote_type)
                await self.point_service.award_comment_vote(updated_vote.id, comment.user_id, comment_id, comment.post_id, vote_type)
                if old_type == VoteType.UP:
                    await self.post_repo.update_comment_vote_counts(comment_id, up_delta=-1, down_delta=1)
                else:
                    await self.post_repo.update_comment_vote_counts(comment_id, up_delta=1, down_delta=-1)
                comment = await self.comment_repo.get_by_id(comment_id)
                return VoteResult(action="changed", vote_type=vote_type.value, up_votes=comment.up_votes, down_votes=comment.down_votes, net_votes=comment.up_votes - comment.down_votes)
        else:
            recent = await self.vote_repo.count_comment_votes_in_hour(voter_id)
            if recent >= COMMENT_VOTE_HOUR_LIMIT:
                raise HTTPException(status_code=429, detail="시간당 댓글 투표는 15회까지 가능합니다")
            vote = await self.vote_repo.create_comment_vote(voter_id, comment_id, vote_type)
            await self.point_service.award_comment_vote(vote.id, comment.user_id, comment_id, comment.post_id, vote_type)
            if vote_type == VoteType.UP:
                await self.post_repo.update_comment_vote_counts(comment_id, up_delta=1)
            else:
                await self.post_repo.update_comment_vote_counts(comment_id, down_delta=1)
            comment = await self.comment_repo.get_by_id(comment_id)
            return VoteResult(action="added", vote_type=vote_type.value, up_votes=comment.up_votes, down_votes=comment.down_votes, net_votes=comment.up_votes - comment.down_votes)
