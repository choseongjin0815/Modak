import uuid

from fastapi import APIRouter, Depends

from app.security.dependencies import get_current_active_user
from app.repository.comment_repository import get_comment_repo
from app.repository.point_repository import get_point_repo
from app.repository.post_repository import get_post_repo
from app.repository.vote_repository import get_vote_repo
from app.models.user import User
from app.models.vote import VoteType
from app.repository.comment_repository import CommentRepository
from app.repository.point_repository import PointRepository
from app.repository.post_repository import PostRepository
from app.repository.vote_repository import VoteRepository
from app.schemas.vote import VoteRequest, VoteResult
from app.services.point_service import PointService
from app.services.vote_service import VoteService

router = APIRouter(tags=["votes"])


def _make_vote_service(vote_repo, post_repo, comment_repo, point_repo):
    point_service = PointService(point_repo)
    return VoteService(vote_repo, post_repo, comment_repo, point_service)


@router.post("/posts/{post_id}/vote", response_model=VoteResult)
async def vote_post(
    post_id: uuid.UUID,
    body: VoteRequest,
    current_user: User = Depends(get_current_active_user),
    vote_repo: VoteRepository = Depends(get_vote_repo),
    post_repo: PostRepository = Depends(get_post_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    point_repo: PointRepository = Depends(get_point_repo),
):
    svc = _make_vote_service(vote_repo, post_repo, comment_repo, point_repo)
    return await svc.vote_post(current_user.id, post_id, VoteType(body.vote_type))


@router.get("/posts/{post_id}/my-vote")
async def get_my_post_vote(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    vote_repo: VoteRepository = Depends(get_vote_repo),
):
    vote = await vote_repo.get_post_vote(current_user.id, post_id)
    return {"vote_type": vote.vote_type.value if vote else None}


@router.post("/comments/{comment_id}/vote", response_model=VoteResult)
async def vote_comment(
    comment_id: uuid.UUID,
    body: VoteRequest,
    current_user: User = Depends(get_current_active_user),
    vote_repo: VoteRepository = Depends(get_vote_repo),
    post_repo: PostRepository = Depends(get_post_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    point_repo: PointRepository = Depends(get_point_repo),
):
    svc = _make_vote_service(vote_repo, post_repo, comment_repo, point_repo)
    return await svc.vote_comment(current_user.id, comment_id, VoteType(body.vote_type))


@router.get("/comments/{comment_id}/my-vote")
async def get_my_comment_vote(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    vote_repo: VoteRepository = Depends(get_vote_repo),
):
    vote = await vote_repo.get_comment_vote(current_user.id, comment_id)
    return {"vote_type": vote.vote_type.value if vote else None}
