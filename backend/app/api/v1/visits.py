from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.visit import Visit

router = APIRouter(prefix="/visits", tags=["visits"])


class VisitRequest(BaseModel):
    visitor_key: str


@router.post("", status_code=204)
async def record_visit(body: VisitRequest, db: AsyncSession = Depends(get_db)):
    db.add(Visit(visitor_key=body.visitor_key))
    await db.commit()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    today = date.today()
    today_count = (
        await db.execute(
            select(func.count()).where(func.date(Visit.created_at) == today)
        )
    ).scalar_one()
    total_count = (
        await db.execute(select(func.count()).select_from(Visit))
    ).scalar_one()
    return {"today": today_count, "total": total_count}
