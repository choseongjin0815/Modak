import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.comment_repository import CommentRepository, get_comment_repo
from app.repository.point_repository import PointRepository, get_point_repo
from app.repository.post_repository import PostRepository, get_post_repo
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.point_service import PointService

router = APIRouter(tags=["comments"])


def build_comment_response(comment, my_vote: str | None = None) -> CommentResponse:
    # 관리자 삭제 댓글은 내용만 대체
    content = "관리자에 의해 삭제된 댓글입니다." if comment.deleted_by_admin else comment.content
    return CommentResponse(
        id=comment.id,
        content=content,
        user_id=comment.user_id,
        post_id=comment.post_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=comment.user.username if not comment.deleted_by_admin else "삭제됨",
        author_points=comment.user.points if not comment.deleted_by_admin else 0,
        up_votes=0 if comment.deleted_by_admin else comment.up_votes,
        down_votes=0 if comment.deleted_by_admin else comment.down_votes,
        my_vote=None if comment.deleted_by_admin else my_vote,
        is_deleted=comment.is_deleted,
        deleted_by_admin=comment.deleted_by_admin,
    )


@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    post_id: uuid.UUID,
    comment_repo: CommentRepository = Depends(get_comment_repo),
):
    comments = await comment_repo.get_by_post_id(post_id)
    return [build_comment_response(c) for c in comments]


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    post_repo: PostRepository = Depends(get_post_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    point_repo: PointRepository = Depends(get_point_repo),
    current_user: User = Depends(get_current_active_user),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    comment = await comment_repo.create(post_id, current_user.id, comment_in)
    point_svc = PointService(point_repo)
    await point_svc.award_comment_created(current_user.id, post_id)
    return build_comment_response(comment)


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: uuid.UUID,
    comment_in: CommentUpdate,
    comment_repo: CommentRepository = Depends(get_comment_repo),
    current_user: User = Depends(get_current_active_user),
):
    comment = await comment_repo.get_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다")
    comment = await comment_repo.update(comment, comment_in)
    return build_comment_response(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    comment_repo: CommentRepository = Depends(get_comment_repo),
    current_user: User = Depends(get_current_active_user),
):
    comment = await comment_repo.get_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
    await comment_repo.delete(comment)
