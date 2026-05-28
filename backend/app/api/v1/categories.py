from fastapi import APIRouter, Depends

from app.repository.category_repository import CategoryRepository, get_category_repo
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    category_repo: CategoryRepository = Depends(get_category_repo),
):
    return await category_repo.get_all()
