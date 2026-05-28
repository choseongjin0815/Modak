from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.report import ReportStatus, ReportTargetType


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: str


class ReportResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    target_type: ReportTargetType
    target_id: UUID
    reason: str
    status: ReportStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportAdminResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    reporter_username: str
    target_type: ReportTargetType
    target_id: UUID
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}


class ReportResolve(BaseModel):
    status: ReportStatus  # RESOLVED or REJECTED
