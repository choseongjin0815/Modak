import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.category_moderator_repository import CategoryModeratorRepository, get_category_mod_repo
from app.repository.comment_repository import CommentRepository, get_comment_repo
from app.repository.moderator_ban_repository import ModeratorBanRepository, get_moderator_ban_repo
from app.repository.notification_repository import NotificationRepository, get_notification_repo
from app.repository.point_repository import PointRepository, get_point_repo
from app.repository.post_repository import PostRepository, get_post_repo
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.point_service import PointService

router = APIRouter(tags=["comments"])


def build_comment_response(
    comment, my_vote: str | None = None, author_is_mod: bool = False
) -> CommentResponse:
    # 관리자 삭제 댓글은 내용만 대체
    content = "관리자에 의해 삭제된 댓글입니다." if comment.deleted_by_admin else comment.content
    return CommentResponse(
        id=comment.id,
        content=content,
        user_id=comment.user_id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=comment.user.username if not comment.deleted_by_admin else "삭제됨",
        author_points=comment.user.points if not comment.deleted_by_admin else 0,
        author_role=comment.user.role.value if not comment.deleted_by_admin else "USER",
        author_is_mod=author_is_mod and not comment.deleted_by_admin,
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
    post_repo: PostRepository = Depends(get_post_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    comments = await comment_repo.get_by_post_id(post_id)
    category_id = await post_repo.get_category_id(post_id)
    mod_user_ids = await cat_mod_repo.get_mod_user_ids_for_category(category_id)
    return [build_comment_response(c, author_is_mod=c.user_id in mod_user_ids) for c in comments]


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    post_repo: PostRepository = Depends(get_post_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    point_repo: PointRepository = Depends(get_point_repo),
    ban_repo: ModeratorBanRepository = Depends(get_moderator_ban_repo),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
    current_user: User = Depends(get_current_active_user),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.category_id and await ban_repo.is_banned(current_user.id, post.category_id):
        raise HTTPException(status_code=403, detail="해당 게시판에서 차단된 사용자입니다")
    if comment_in.parent_id:
        import uuid as _uuid
        parent = await comment_repo.get_by_id(_uuid.UUID(comment_in.parent_id))
        if not parent or parent.post_id != post_id:
            raise HTTPException(status_code=400, detail="유효하지 않은 부모 댓글입니다")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="대댓글에는 답글을 달 수 없습니다")
    comment = await comment_repo.create(post_id, current_user.id, comment_in)
    point_svc = PointService(point_repo)
    await point_svc.award_comment_created(current_user.id, post_id)

    # 알림 발송
    actor = current_user.username
    post_link = f"/posts/{post_id}"
    notified: set = set()

    # 대댓글: 부모 댓글 작성자에게 알림
    if comment_in.parent_id and parent:
        if parent.user_id != current_user.id:
            await noti_repo.create(
                user_id=parent.user_id,
                type="comment_reply",
                actor=actor,
                content=f"{actor}님이 내 댓글에 답글을 달았습니다.",
                link=post_link,
            )
            notified.add(parent.user_id)

    # 게시글 작성자에게 댓글 알림 (중복 제외)
    if post.user_id != current_user.id and post.user_id not in notified:
        await noti_repo.create(
            user_id=post.user_id,
            type="post_comment",
            actor=actor,
            content=f"{actor}님이 내 게시글에 댓글을 달았습니다.",
            link=post_link,
        )

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
    post_repo: PostRepository = Depends(get_post_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    current_user: User = Depends(get_current_active_user),
):
    comment = await comment_repo.get_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    if comment.user_id == current_user.id:
        await comment_repo.delete(comment)
    else:
        category_id = await post_repo.get_category_id(comment.post_id)
        if not await cat_mod_repo.is_moderator(current_user.id, category_id):
            raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
        await post_repo.soft_delete_comment(comment, by_admin=True)
