from fastapi import APIRouter, Depends, HTTPException, status

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.report_repository import ReportRepository, get_report_repo
from app.schemas.report import ReportCreate, ReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_in: ReportCreate,
    current_user: User = Depends(get_current_active_user),
    report_repo: ReportRepository = Depends(get_report_repo),
):
    # 동일 대상에 대한 중복 신고 방지
    duplicate = await report_repo.exists_pending(
        current_user.id, report_in.target_type, report_in.target_id
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="이미 신고 처리 중인 항목입니다")

    report = await report_repo.create(
        reporter_id=current_user.id,
        target_type=report_in.target_type,
        target_id=report_in.target_id,
        reason=report_in.reason,
    )
    return report
