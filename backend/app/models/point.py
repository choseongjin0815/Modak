import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PointReason(str, enum.Enum):
    ATTENDANCE = "attendance"
    POST_UPVOTE_RECEIVED = "post_upvote_received"
    POST_DOWNVOTE_RECEIVED = "post_downvote_received"
    COMMENT_UPVOTE_RECEIVED = "comment_upvote_received"
    COMMENT_DOWNVOTE_RECEIVED = "comment_downvote_received"
    POST_CREATED = "post_created"
    COMMENT_CREATED = "comment_created"


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[PointReason] = mapped_column(Enum(PointReason), nullable=False)
    reference_vote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reference_post_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    reference_comment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
