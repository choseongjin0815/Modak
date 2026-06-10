import logging
import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.security.password import get_password_hash, verify_password
from app.models.post import Post
from app.models.user import User, UserRole
from app.schemas.user import UserCreate

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(days=1)

logger = logging.getLogger(__name__)


class AccountLockedException(Exception):
    def __init__(self, locked_until: datetime) -> None:
        self.locked_until = locked_until


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate) -> User:
        user = User(
            username=user_in.username,
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate(self, username: str, password: str) -> User | None:
        user = await self.get_by_username(username)
        if not user:
            return None

        now = datetime.now(timezone.utc)
        if user.locked_until and user.locked_until > now:
            raise AccountLockedException(user.locked_until)

        if not verify_password(password, user.hashed_password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = now + LOCKOUT_DURATION
                user.failed_login_attempts = 0
                logger.warning("계정 잠금 처리: %s (5회 실패)", username)
            else:
                logger.debug("비밀번호 불일치: %s (%d회)", username, user.failed_login_attempts)
            self.db.add(user)
            await self.db.commit()
            return None

        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_profile(
        self,
        user: User,
        username: str | None = None,
        email: str | None = None,
        new_password: str | None = None,
    ) -> User:
        if username:
            user.username = username
        if email:
            user.email = email
        if new_password:
            user.hashed_password = get_password_hash(new_password)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_by_admin(
        self,
        user: User,
        is_active: bool | None = None,
        role: UserRole | None = None,
    ) -> User:
        if is_active is not None:
            user.is_active = is_active
        if role is not None:
            user.role = role
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_list(self, page: int = 1, size: int = 20, search: str | None = None):
        query = select(User)
        if search:
            query = query.where(
                User.username.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
            )
        query = query.order_by(User.created_at.desc())
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).scalars().all()
        pages = math.ceil(total / size) if total > 0 else 1
        return list(rows), total, pages

    async def get_my_posts(self, user_id: uuid.UUID, page: int = 1, size: int = 20):
        query = (
            select(Post)
            .options(selectinload(Post.category))
            .where(Post.user_id == user_id, Post.is_deleted == False)  # noqa: E712
            .order_by(Post.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).scalars().all()
        pages = math.ceil(total / size) if total > 0 else 1
        return list(rows), total, pages


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_user_repo(db: AsyncSession = Depends(get_db)) -> "UserRepository":
    return UserRepository(db)
