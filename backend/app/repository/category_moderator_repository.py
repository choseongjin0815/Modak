import uuid

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.category_moderator import CategoryModerator
from app.models.user import User


class CategoryModeratorRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def assign(self, user_id: uuid.UUID, category_id: int) -> CategoryModerator:
        mod = CategoryModerator(user_id=user_id, category_id=category_id)
        self.db.add(mod)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise
        await self.db.refresh(mod)
        return mod

    async def revoke(self, user_id: uuid.UUID, category_id: int) -> bool:
        result = await self.db.execute(
            delete(CategoryModerator).where(
                CategoryModerator.user_id == user_id,
                CategoryModerator.category_id == category_id,
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def is_moderator(self, user_id: uuid.UUID, category_id: int | None) -> bool:
        if category_id is None:
            return False
        result = await self.db.execute(
            select(CategoryModerator).where(
                CategoryModerator.user_id == user_id,
                CategoryModerator.category_id == category_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_mod_user_ids_for_category(self, category_id: int | None) -> set[uuid.UUID]:
        if category_id is None:
            return set()
        result = await self.db.execute(
            select(CategoryModerator.user_id).where(CategoryModerator.category_id == category_id)
        )
        return set(result.scalars().all())

    async def get_categories_for_user(self, user_id: uuid.UUID) -> list:
        result = await self.db.execute(
            select(Category)
            .join(CategoryModerator, CategoryModerator.category_id == Category.id)
            .where(CategoryModerator.user_id == user_id)
            .order_by(Category.sort_order)
        )
        return list(result.scalars().all())

    async def get_all_with_details(self) -> list:
        result = await self.db.execute(
            select(
                CategoryModerator,
                User.username,
                Category.name.label("cat_name"),
                Category.slug.label("cat_slug"),
            )
            .join(User, CategoryModerator.user_id == User.id)
            .join(Category, CategoryModerator.category_id == Category.id)
            .order_by(Category.sort_order, User.username)
        )
        return result.all()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_category_mod_repo(db: AsyncSession = Depends(get_db)) -> "CategoryModeratorRepository":
    return CategoryModeratorRepository(db)
