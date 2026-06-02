import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"), default=UserRole.USER, server_default="USER"
    )
    points: Mapped[int] = mapped_column(Integer, default=0)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="user", lazy="select")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user", lazy="select")
    post_votes: Mapped[list["PostVote"]] = relationship("PostVote", back_populates=None, lazy="select", cascade="all, delete-orphan", foreign_keys="PostVote.user_id")
    comment_votes: Mapped[list["CommentVote"]] = relationship("CommentVote", back_populates=None, lazy="select", cascade="all, delete-orphan", foreign_keys="CommentVote.user_id")
    bookmarks: Mapped[list["Bookmark"]] = relationship("Bookmark", back_populates=None, lazy="select", cascade="all, delete-orphan", foreign_keys="Bookmark.user_id")
