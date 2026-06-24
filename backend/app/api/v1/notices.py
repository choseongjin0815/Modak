import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.security.dependencies import get_current_active_user, require_role
from app.models.notice import Notice
from app.models.user import User, UserRole
from app.repository.notice_repository import NoticeRepository, get_notice_repo
from app.schemas.notice import (
    NoticeCreate,
    NoticeListItem,
    NoticeListResult,
    NoticeResponse,
    NoticeUpdate,
)

router = APIRouter(prefix="/notices", tags=["notices"])


def build_notice_response(notice: Notice, view_count: int | None = None) -> NoticeResponse:
    """author 관계는 호출 전에 로드되어 있어야 한다(MissingGreenlet 회피)."""
    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        is_pinned=notice.is_pinned,
        view_count=notice.view_count if view_count is None else view_count,
        author_id=notice.author_id,
        author=notice.author.username if notice.author else None,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.get("", response_model=NoticeListResult)
async def list_notices(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    notice_repo: NoticeRepository = Depends(get_notice_repo),
):
    return await notice_repo.get_list(search=search, page=page, size=size)


@router.get("/pinned", response_model=list[NoticeListItem])
async def list_pinned_notices(
    limit: int = Query(3, ge=1, le=10),
    notice_repo: NoticeRepository = Depends(get_notice_repo),
):
    return await notice_repo.get_pinned(limit=limit)


@router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice(
    notice_id: uuid.UUID,
    notice_repo: NoticeRepository = Depends(get_notice_repo),
):
    notice = await notice_repo.get_by_id(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")
    # author 등 응답에 필요한 속성은 이미 로드됨. 마지막에 조회수 증가(commit).
    await notice_repo.increment_view_count(notice_id)
    return build_notice_response(notice, view_count=notice.view_count + 1)


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
@require_role(UserRole.ADMIN)
async def create_notice(
    body: NoticeCreate,
    notice_repo: NoticeRepository = Depends(get_notice_repo),
    current_user: User = Depends(get_current_active_user),
):
    notice = await notice_repo.create(body, current_user.id)
    notice = await notice_repo.get_by_id(notice.id)
    return build_notice_response(notice)


@router.put("/{notice_id}", response_model=NoticeResponse)
@require_role(UserRole.ADMIN)
async def update_notice(
    notice_id: uuid.UUID,
    body: NoticeUpdate,
    notice_repo: NoticeRepository = Depends(get_notice_repo),
    current_user: User = Depends(get_current_active_user),
):
    notice = await notice_repo.get_by_id(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")

    fields: dict[str, Any] = {}
    if "title" in body.model_fields_set and body.title is not None:
        fields["title"] = body.title
    if "content" in body.model_fields_set and body.content is not None:
        fields["content"] = body.content
    if "is_pinned" in body.model_fields_set and body.is_pinned is not None:
        fields["is_pinned"] = body.is_pinned

    if fields:
        await notice_repo.update(notice, **fields)
    notice = await notice_repo.get_by_id(notice_id)
    return build_notice_response(notice)


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_role(UserRole.ADMIN)
async def delete_notice(
    notice_id: uuid.UUID,
    notice_repo: NoticeRepository = Depends(get_notice_repo),
    current_user: User = Depends(get_current_active_user),
):
    notice = await notice_repo.get_by_id(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")
    await notice_repo.delete(notice)
