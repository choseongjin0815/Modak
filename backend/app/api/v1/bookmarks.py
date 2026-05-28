import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.bookmark_repository import BookmarkRepository, get_bookmark_repo
from app.repository.post_repository import PostRepository, get_post_repo

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post("/{post_id}")
async def toggle_bookmark(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    bookmark_repo: BookmarkRepository = Depends(get_bookmark_repo),
    post_repo: PostRepository = Depends(get_post_repo),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    existing = await bookmark_repo.get(current_user.id, post_id)
    if existing:
        await bookmark_repo.delete(existing)
        return {"bookmarked": False}
    await bookmark_repo.create(current_user.id, post_id)
    return {"bookmarked": True}


@router.get("")
async def get_my_bookmarks(
    current_user: User = Depends(get_current_active_user),
    bookmark_repo: BookmarkRepository = Depends(get_bookmark_repo),
):
    post_ids = await bookmark_repo.get_user_bookmarks(current_user.id)
    return {"bookmarked_post_ids": [str(pid) for pid in post_ids]}
