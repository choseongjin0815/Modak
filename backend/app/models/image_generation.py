import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImageGeneration(Base):
    """AI 이미지 생성 사용량 추적 테이블 (생성 1건당 1행)."""

    __tablename__ = "image_generations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    # 임시 token (= 임시 stored 파일명). 게시 시 post로 이동되더라도 추적용으로 보존
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # 게시로 확정되면 채움(통계용). FK는 걸지 않음 — post 삭제와 무관히 사용량 이력 보존
    post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
