import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.image_generation import ImageGeneration


class ImageGenerationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def count_recent(self, user_id: uuid.UUID, window_hours: int) -> int:
        """롤링 윈도우(최근 window_hours시간) 내 생성 횟수."""
        since = datetime.now(UTC) - timedelta(hours=window_hours)
        result = await self.db.execute(
            select(func.count(ImageGeneration.id)).where(
                ImageGeneration.user_id == user_id,
                ImageGeneration.created_at >= since,
            )
        )
        return result.scalar_one()

    async def get_oldest_active(
        self, user_id: uuid.UUID, window_hours: int
    ) -> ImageGeneration | None:
        """reset_at 계산용: 윈도우 내 가장 오래된 생성 기록 1건."""
        since = datetime.now(UTC) - timedelta(hours=window_hours)
        result = await self.db.execute(
            select(ImageGeneration)
            .where(
                ImageGeneration.user_id == user_id,
                ImageGeneration.created_at >= since,
            )
            .order_by(ImageGeneration.created_at.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: uuid.UUID,
        prompt: str,
        stored_filename: str,
    ) -> ImageGeneration:
        """생성 1건 기록 후 commit (사용량 차감 확정)."""
        record = ImageGeneration(
            user_id=user_id,
            prompt=prompt,
            stored_filename=stored_filename,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_image_generation_repo(
    db: AsyncSession = Depends(get_db),
) -> "ImageGenerationRepository":
    return ImageGenerationRepository(db)
