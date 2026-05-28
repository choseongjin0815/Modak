from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.category import Category
from app.models.post import Post
from app.repository.category_repository import CategoryRepository, get_category_repo
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    category_repo: CategoryRepository = Depends(get_category_repo),
):
    return await category_repo.get_all()


@router.get("/group-stats")
async def get_group_stats(db: AsyncSession = Depends(get_db)):
    """그룹별 게시글 수 반환 (Navbar 우선순위 계산용)"""
    result = await db.execute(
        select(
            Category.group,
            func.count(Post.id).label("post_count"),
        )
        .outerjoin(Post, (Post.category_id == Category.id) & (Post.is_deleted == False))  # noqa: E712
        .group_by(Category.group)
    )
    return {(row.group or "기타"): row.post_count for row in result.all()}
