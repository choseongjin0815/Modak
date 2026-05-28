import os
import uuid
from typing import Any, Literal

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.security.dependencies import get_current_active_user, get_optional_user
from app.repository.blacklist_repository import BlacklistRepository, get_blacklist_repo
from app.repository.bookmark_repository import BookmarkRepository, get_bookmark_repo
from app.repository.category_repository import CategoryRepository, get_category_repo
from app.repository.point_repository import PointRepository, get_point_repo
from app.repository.category_moderator_repository import CategoryModeratorRepository, get_category_mod_repo
from app.repository.moderator_ban_repository import ModeratorBanRepository, get_moderator_ban_repo
from app.repository.post_repository import HOT_THRESHOLD, PostRepository, get_post_repo
from app.repository.vote_repository import VoteRepository, get_vote_repo
from app.config import settings
from app.models.user import User
from app.schemas.category import CategoryResponse
from app.schemas.post import FileResponse, PostCreate, PostListResult, PostResponse
from app.services.point_service import PointService

router = APIRouter(prefix="/posts", tags=["posts"])


class PostUpdateRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None  # slug string from client


def build_post_response(
    post,
    my_vote: str | None = None,
    is_bookmarked: bool = False,
    author_is_mod: bool = False,
    viewer_is_mod: bool = False,
) -> PostResponse:
    category = CategoryResponse.model_validate(post.category) if post.category else None
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        user_id=post.user_id,
        view_count=post.view_count,
        up_votes=post.up_votes,
        down_votes=post.down_votes,
        net_votes=post.up_votes - post.down_votes,
        is_hot=(post.up_votes - post.down_votes) >= HOT_THRESHOLD,
        category=category,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=post.user.username,
        author_points=post.user.points,
        author_role=post.user.role.value,
        author_is_mod=author_is_mod,
        viewer_is_mod=viewer_is_mod,
        files=[
            FileResponse(
                id=f.id,
                filename=f.filename,
                original_filename=f.original_filename,
                file_size=f.file_size,
                content_type=f.content_type,
            )
            for f in post.files
        ],
        my_vote=my_vote,
        is_bookmarked=is_bookmarked,
    )


async def _save_upload_files(
    post_repo: PostRepository,
    post_id: uuid.UUID,
    upload_files: list[UploadFile],
) -> None:
    """업로드된 파일을 디스크에 저장하고 DB에 등록한다."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    for upload_file in upload_files:
        if upload_file.filename:
            ext = os.path.splitext(upload_file.filename)[1]
            stored_name = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
            async with aiofiles.open(file_path, "wb") as f:
                content_bytes = await upload_file.read()
                await f.write(content_bytes)
            await post_repo.add_file(
                post_id=post_id,
                filename=stored_name,
                original_filename=upload_file.filename,
                file_path=file_path,
                file_size=len(content_bytes),
                content_type=upload_file.content_type or "application/octet-stream",
            )


async def _resolve_category_id(slug: str | None, category_repo: CategoryRepository) -> int | None:
    if not slug:
        return None
    cat = await category_repo.get_by_slug(slug)
    return cat.id if cat else None


@router.get("", response_model=PostListResult)
async def list_posts(
    search: str | None = Query(None),
    sort_by: Literal["created_at", "view_count", "net_votes"] = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(8, ge=1, le=100),
    category: str | None = Query(None),
    hot: bool = Query(False),
    post_repo: PostRepository = Depends(get_post_repo),
    category_repo: CategoryRepository = Depends(get_category_repo),
    current_user: User | None = Depends(get_optional_user),
    blacklist_repo: BlacklistRepository = Depends(get_blacklist_repo),
):
    blocked_by = await blacklist_repo.get_blocker_ids(current_user.id) if current_user else None
    category_id = await _resolve_category_id(category, category_repo)
    return await post_repo.get_list(
        search=search, sort_by=sort_by, sort_order=sort_order,
        page=page, size=size, category_id=category_id, hot_only=hot,
        blocked_by=blocked_by,
    )


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    title: str = Form(...),
    content: str | None = Form(None),
    category: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    post_repo: PostRepository = Depends(get_post_repo),
    category_repo: CategoryRepository = Depends(get_category_repo),
    point_repo: PointRepository = Depends(get_point_repo),
    ban_repo: ModeratorBanRepository = Depends(get_moderator_ban_repo),
    current_user: User = Depends(get_current_active_user),
):
    category_id = await _resolve_category_id(category, category_repo)
    if category_id and await ban_repo.is_banned(current_user.id, category_id):
        raise HTTPException(status_code=403, detail="해당 게시판에서 차단된 사용자입니다")
    post = await post_repo.create(
        PostCreate(title=title, content=content, category_id=category_id), current_user.id
    )
    await _save_upload_files(post_repo, post.id, files)
    point_svc = PointService(point_repo)
    await point_svc.award_post_created(current_user.id, post.id)
    post = await post_repo.get_by_id(post.id)
    return build_post_response(post)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
    vote_repo: VoteRepository = Depends(get_vote_repo),
    bookmark_repo: BookmarkRepository = Depends(get_bookmark_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.deleted_by_admin:
        raise HTTPException(status_code=410, detail="관리자에 의해 삭제된 게시글입니다")
    if post.is_deleted:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    is_mod = await cat_mod_repo.is_moderator(post.user_id, post.category_id)
    await post_repo.increment_view_count(post_id)
    post.view_count += 1
    return build_post_response(post, author_is_mod=is_mod)


@router.get("/{post_id}/detail", response_model=PostResponse)
async def get_post_with_auth(
    post_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
    vote_repo: VoteRepository = Depends(get_vote_repo),
    bookmark_repo: BookmarkRepository = Depends(get_bookmark_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    current_user: User = Depends(get_current_active_user),
):
    """인증된 사용자용 - my_vote, is_bookmarked 포함"""
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.deleted_by_admin:
        raise HTTPException(status_code=410, detail="관리자에 의해 삭제된 게시글입니다")
    if post.is_deleted:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    is_mod = await cat_mod_repo.is_moderator(post.user_id, post.category_id)
    viewer_is_mod = await cat_mod_repo.is_moderator(current_user.id, post.category_id)
    vote = await vote_repo.get_post_vote(current_user.id, post_id)
    bookmark = await bookmark_repo.get(current_user.id, post_id)
    my_vote = vote.vote_type.value if vote else None
    return build_post_response(post, my_vote=my_vote, is_bookmarked=bookmark is not None, author_is_mod=is_mod, viewer_is_mod=viewer_is_mod)


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: uuid.UUID,
    body: PostUpdateRequest,
    post_repo: PostRepository = Depends(get_post_repo),
    category_repo: CategoryRepository = Depends(get_category_repo),
    current_user: User = Depends(get_current_active_user),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다")

    fields: dict[str, Any] = {}
    if body.title is not None:
        fields["title"] = body.title
    if body.content is not None:
        fields["content"] = body.content
    if "category" in body.model_fields_set:
        fields["category_id"] = await _resolve_category_id(body.category, category_repo)

    await post_repo.update(post, **fields)
    post = await post_repo.get_by_id(post_id)
    return build_post_response(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
    current_user: User = Depends(get_current_active_user),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.user_id == current_user.id:
        await post_repo.delete(post)
    elif await cat_mod_repo.is_moderator(current_user.id, post.category_id):
        await post_repo.soft_delete(post, by_admin=True)
    else:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")


@router.post("/{post_id}/files", response_model=list)
async def upload_files(
    post_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    post_repo: PostRepository = Depends(get_post_repo),
    current_user: User = Depends(get_current_active_user),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    uploaded = []
    for upload_file in files:
        if upload_file.filename:
            ext = os.path.splitext(upload_file.filename)[1]
            stored_name = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
            async with aiofiles.open(file_path, "wb") as f:
                content_bytes = await upload_file.read()
                await f.write(content_bytes)
            file_obj = await post_repo.add_file(
                post_id=post.id,
                filename=stored_name,
                original_filename=upload_file.filename,
                file_path=file_path,
                file_size=len(content_bytes),
                content_type=upload_file.content_type or "application/octet-stream",
            )
            uploaded.append({"id": str(file_obj.id), "original_filename": file_obj.original_filename})
    return uploaded
