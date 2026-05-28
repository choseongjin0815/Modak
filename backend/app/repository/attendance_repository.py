import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance


class AttendanceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_today(self, user_id: uuid.UUID) -> Attendance | None:
        today = date.today()
        result = await self.db.execute(
            select(Attendance).where(Attendance.user_id == user_id, Attendance.date == today)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID) -> Attendance:
        attendance = Attendance(user_id=user_id, date=date.today())
        self.db.add(attendance)
        await self.db.commit()
        await self.db.refresh(attendance)
        return attendance


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_attendance_repo(db: AsyncSession = Depends(get_db)) -> "AttendanceRepository":
    return AttendanceRepository(db)
