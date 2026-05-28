import uuid

from app.models.point import PointReason
from app.repository.attendance_repository import AttendanceRepository
from app.repository.point_repository import PointRepository
from app.schemas.point import AttendanceResponse

ATTENDANCE_POINTS = 20


class AttendanceService:
    def __init__(self, attendance_repo: AttendanceRepository, point_repo: PointRepository) -> None:
        self.attendance_repo = attendance_repo
        self.point_repo = point_repo

    async def check_in(self, user_id: uuid.UUID, current_points: int) -> AttendanceResponse:
        existing = await self.attendance_repo.get_today(user_id)
        if existing:
            return AttendanceResponse(already_attended=True, points_earned=0, total_points=current_points)

        await self.attendance_repo.create(user_id)
        await self.point_repo.add_transaction(
            user_id=user_id,
            amount=ATTENDANCE_POINTS,
            reason=PointReason.ATTENDANCE,
        )
        return AttendanceResponse(already_attended=False, points_earned=ATTENDANCE_POINTS, total_points=current_points + ATTENDANCE_POINTS)
