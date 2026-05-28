import functools
import inspect

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.models.user import User, UserRole
from app.repository.user_repository import UserRepository, get_user_repo
from app.security.jwt import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ── 인증 의존성 ───────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str | None = payload.get("sub")
    if username is None:
        raise credentials_exception
    user = await user_repo.get_by_username(username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 계정입니다")
    return current_user


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional),
    user_repo: UserRepository = Depends(get_user_repo),
) -> User | None:
    """토큰 없으면 None, 있으면 User 반환 (비로그인 허용 엔드포인트용)"""
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    username: str | None = payload.get("sub")
    if not username:
        return None
    return await user_repo.get_by_username(username)


# ── 역할 계층 ─────────────────────────────────────────────
# ADMIN(1) ≥ USER(0) : 높은 레벨은 낮은 레벨의 모든 권한 포함

_ROLE_LEVEL: dict[UserRole, int] = {
    UserRole.USER: 0,
    UserRole.ADMIN: 1,
}


def require_role(min_role: UserRole):
    """
    라우터 함수에 적용하는 역할 검사 데코레이터.

        @router.get("/admin/users")
        @require_role(UserRole.ADMIN)
        async def list_users(...):
            ...
    """
    async def _check(
        current_user: User = Depends(get_current_active_user),
    ) -> None:
        if _ROLE_LEVEL.get(current_user.role, 0) < _ROLE_LEVEL[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한이 없습니다",
            )

    def decorator(func):
        sig = inspect.signature(func)
        params = list(sig.parameters.values())
        params.append(
            inspect.Parameter(
                '_role_dep',
                inspect.Parameter.KEYWORD_ONLY,
                default=Depends(_check),
                annotation=None,
            )
        )

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            kwargs.pop('_role_dep', None)
            return await func(*args, **kwargs)

        wrapper.__signature__ = sig.replace(parameters=params)
        return wrapper

    return decorator
