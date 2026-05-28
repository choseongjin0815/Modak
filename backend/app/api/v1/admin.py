import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from app.security.dependencies import get_current_active_user, require_role
from app.models.report import ReportStatus
from app.models.user import User, UserRole
from app.repository.category_moderator_repository import CategoryModeratorRepository, get_category_mod_repo
from app.repository.post_repository import PostRepository, get_post_repo
from app.repository.report_repository import ReportRepository, get_report_repo
from app.repository.user_repository import UserRepository, get_user_repo
from app.schemas.report import ReportResolve
from app.schemas.user import UserAdminResponse, UserAdminUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


# ── 회원 관리 ──────────────────────────────────────────────

@router.get("/users")
@require_role(UserRole.ADMIN)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    user_repo: UserRepository = Depends(get_user_repo),
):
    users, total, pages = await user_repo.get_list(page=page, size=size, search=search)
    return {
        "items": [UserAdminResponse.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.put("/users/{user_id}", response_model=UserAdminResponse)
@require_role(UserRole.ADMIN)
async def update_user(
    user_id: uuid.UUID,
    user_in: UserAdminUpdate,
    user_repo: UserRepository = Depends(get_user_repo),
):
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다")
    return await user_repo.update_by_admin(
        user, is_active=user_in.is_active, role=user_in.role
    )


# ── 게시글 관리 ────────────────────────────────────────────

@router.get("/posts")
@require_role(UserRole.ADMIN)
async def list_posts_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    post_repo: PostRepository = Depends(get_post_repo),
):
    return await post_repo.get_list_admin(page=page, size=size, search=search)


@router.delete("/posts/{post_id}", status_code=204)
@require_role(UserRole.ADMIN)
async def admin_delete_post(
    post_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
):
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    await post_repo.soft_delete(post, by_admin=True)


@router.delete("/comments/{comment_id}", status_code=204)
@require_role(UserRole.ADMIN)
async def admin_delete_comment(
    comment_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
):
    comment = await post_repo.get_comment_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    await post_repo.soft_delete_comment(comment, by_admin=True)


# ── 신고 관리 ──────────────────────────────────────────────

@router.get("/reports")
@require_role(UserRole.ADMIN)
async def list_reports(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: ReportStatus | None = Query(None),
    report_repo: ReportRepository = Depends(get_report_repo),
):
    reports, total, pages = await report_repo.get_list(status=status, page=page, size=size)
    items = [
        {
            "id": str(r.id),
            "reporter_id": str(r.reporter_id),
            "reporter_username": r.reporter.username if r.reporter else "탈퇴한 사용자",
            "target_type": r.target_type,
            "target_id": str(r.target_id),
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        }
        for r in reports
    ]
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


# ── 운영자 관리 ────────────────────────────────────────────

class ModeratorAssignRequest(BaseModel):
    user_id: str
    category_id: int


@router.get("/moderators")
@require_role(UserRole.ADMIN)
async def list_moderators(
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    rows = await cat_mod_repo.get_all_with_details()
    return [
        {
            "user_id": str(row.CategoryModerator.user_id),
            "username": row.username,
            "category_id": row.CategoryModerator.category_id,
            "category_name": row.cat_name,
            "category_slug": row.cat_slug,
            "created_at": row.CategoryModerator.created_at.isoformat(),
        }
        for row in rows
    ]


@router.post("/moderators", status_code=201)
@require_role(UserRole.ADMIN)
async def assign_moderator(
    body: ModeratorAssignRequest,
    user_repo: UserRepository = Depends(get_user_repo),
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    user = await user_repo.get_by_id(uuid.UUID(body.user_id))
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    try:
        await cat_mod_repo.assign(user.id, body.category_id)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="이미 운영자로 지정된 사용자입니다")
    return {"message": "운영자로 지정되었습니다"}


@router.delete("/moderators/{user_id}/{category_id}", status_code=204)
@require_role(UserRole.ADMIN)
async def revoke_moderator(
    user_id: uuid.UUID,
    category_id: int,
    cat_mod_repo: CategoryModeratorRepository = Depends(get_category_mod_repo),
):
    removed = await cat_mod_repo.revoke(user_id, category_id)
    if not removed:
        raise HTTPException(status_code=404, detail="운영자 지정을 찾을 수 없습니다")


# ── 신고 관리 ──────────────────────────────────────────────

@router.put("/reports/{report_id}")
@require_role(UserRole.ADMIN)
async def resolve_report(
    report_id: uuid.UUID,
    body: ReportResolve,
    current_user: User = Depends(get_current_active_user),  # 캐싱되므로 이중 쿼리 없음
    report_repo: ReportRepository = Depends(get_report_repo),
):
    if body.status == ReportStatus.PENDING:
        raise HTTPException(status_code=400, detail="RESOLVED 또는 REJECTED만 가능합니다")
    report = await report_repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")
    report = await report_repo.resolve(report, status=body.status, resolved_by_id=current_user.id)
    return {"id": str(report.id), "status": report.status}
