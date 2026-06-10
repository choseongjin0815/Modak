import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.security.jwt import create_access_token
from app.repository.user_repository import AccountLockedException, UserRepository, get_user_repo
from app.schemas.user import Token, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    user_repo: UserRepository = Depends(get_user_repo),
):
    if await user_repo.get_by_username(user_in.username):
        logger.warning("회원가입 실패 — 중복 아이디: %s", user_in.username)
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다")
    if await user_repo.get_by_email(user_in.email):
        logger.warning("회원가입 실패 — 중복 이메일: %s", user_in.email)
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")
    user = await user_repo.create(user_in)
    logger.info("신규 회원가입: %s", user.username)
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: UserRepository = Depends(get_user_repo),
):
    try:
        user = await user_repo.authenticate(form_data.username, form_data.password)
    except AccountLockedException as e:
        unlock = e.locked_until.strftime("%Y년 %m월 %d일 %H:%M")
        logger.warning("로그인 차단 — 잠긴 계정: %s (해제: %s)", form_data.username, unlock)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"로그인 5회 실패로 계정이 잠겼습니다. {unlock}에 잠금이 해제됩니다.",
        )
    if not user:
        logger.warning("로그인 실패 — 잘못된 자격증명: %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning("로그인 실패 — 비활성화 계정: %s", user.username)
        raise HTTPException(status_code=400, detail="비활성화된 계정입니다")
    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})
    logger.info("로그인 성공: %s", user.username)
    return {"access_token": access_token, "token_type": "bearer"}
