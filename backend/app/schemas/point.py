from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PointTransactionResponse(BaseModel):
    id: UUID
    amount: int
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PointResponse(BaseModel):
    points: int
    transactions: list[PointTransactionResponse] = []


class AttendanceResponse(BaseModel):
    already_attended: bool
    points_earned: int
    total_points: int
