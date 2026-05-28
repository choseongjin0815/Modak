import math
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.report import Report, ReportStatus, ReportTargetType
from app.models.user import User


class ReportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        reporter_id: uuid.UUID,
        target_type: ReportTargetType,
        target_id: uuid.UUID,
        reason: str,
    ) -> Report:
        report = Report(
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_by_id(self, report_id: uuid.UUID) -> Report | None:
        result = await self.db.execute(
            select(Report)
            .options(selectinload(Report.reporter))
            .where(Report.id == report_id)
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        status: ReportStatus | None = None,
        page: int = 1,
        size: int = 20,
    ):
        query = select(Report).options(selectinload(Report.reporter))
        if status:
            query = query.where(Report.status == status)
        query = query.order_by(Report.created_at.desc())
        total = (
            await self.db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).scalars().all()
        pages = math.ceil(total / size) if total > 0 else 1
        return list(rows), total, pages

    async def resolve(
        self,
        report: Report,
        status: ReportStatus,
        resolved_by_id: uuid.UUID,
    ) -> Report:
        report.status = status
        report.resolved_at = datetime.now(UTC)
        report.resolved_by_id = resolved_by_id
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def exists_pending(
        self,
        reporter_id: uuid.UUID,
        target_type: ReportTargetType,
        target_id: uuid.UUID,
    ) -> bool:
        result = await self.db.execute(
            select(func.count(Report.id)).where(
                Report.reporter_id == reporter_id,
                Report.target_type == target_type,
                Report.target_id == target_id,
                Report.status == ReportStatus.PENDING,
            )
        )
        return result.scalar_one() > 0


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_report_repo(db: AsyncSession = Depends(get_db)) -> "ReportRepository":
    return ReportRepository(db)
