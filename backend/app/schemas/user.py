from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: UUID
    nickname: str
    nickname_changed_at: datetime | None = None
    is_active: bool
    role: UserRole
    points: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    username: str | None = None
    nickname: str | None = None
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None


class UserNicknameUpdate(BaseModel):
    """닉네임 단독 변경 요청용.

    실제 변경은 PUT /api/v1/users/me (UserUpdate) 로 처리하지만,
    프론트에서 닉네임만 보낼 때의 타입 참조용으로 제공한다.

    에러 응답(메인 처리는 api/v1/users.py update_my_profile):
      - 30일 미경과 → 400 "닉네임은 30일에 한 번만 변경할 수 있습니다. {date} 이후 변경 가능합니다."
      - 중복 → 409 "이미 사용 중인 닉네임입니다"
      - 형식 위반 → 400 "닉네임은 2~20자로 입력해주세요"
    """
    nickname: str


class UserStatsResponse(BaseModel):
    post_count: int
    comment_count: int
    today_votes_received: int


class UserDeleteRequest(BaseModel):
    password: str


class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None


class UserAdminResponse(BaseModel):
    id: UUID
    username: str
    nickname: str
    email: str
    is_active: bool
    role: UserRole
    points: int
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
