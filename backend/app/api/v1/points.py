from fastapi import APIRouter, Depends

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.attendance_repository import AttendanceRepository, get_attendance_repo
from app.repository.point_repository import PointRepository, get_point_repo
from app.schemas.point import AttendanceResponse, PointResponse, PointTransactionResponse
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/points", tags=["points"])


@router.get("/me", response_model=PointResponse)
async def get_my_points(
    current_user: User = Depends(get_current_active_user),
    point_repo: PointRepository = Depends(get_point_repo),
):
    transactions = await point_repo.get_user_transactions(current_user.id)
    return PointResponse(
        points=current_user.points,
        transactions=[PointTransactionResponse.model_validate(t) for t in transactions],
    )


@router.post("/attendance", response_model=AttendanceResponse)
async def check_attendance(
    current_user: User = Depends(get_current_active_user),
    point_repo: PointRepository = Depends(get_point_repo),
    attendance_repo: AttendanceRepository = Depends(get_attendance_repo),
):
    svc = AttendanceService(attendance_repo, point_repo)
    return await svc.check_in(current_user.id, current_user.points)
