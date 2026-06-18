import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse

from app.repository.image_generation_repository import (
    ImageGenerationRepository,
    get_image_generation_repo,
)
from app.schemas.image import (
    ImageGenerateRequest,
    ImageGenerateResponse,
    ImageQuotaResponse,
)
from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.services.image_service import (
    ImageGenDisabledError,
    ImageGenFailedError,
    ImageQuotaExceededError,
    ImageService,
    tmp_file_path,
)

router = APIRouter(prefix="/images", tags=["images"])


@router.get("/quota", response_model=ImageQuotaResponse)
async def get_quota(
    repo: ImageGenerationRepository = Depends(get_image_generation_repo),
    current_user: User = Depends(get_current_active_user),
):
    service = ImageService(repo)
    return await service.get_quota(current_user.id)


@router.post(
    "/generate",
    response_model=ImageGenerateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_image(
    body: ImageGenerateRequest,
    repo: ImageGenerationRepository = Depends(get_image_generation_repo),
    current_user: User = Depends(get_current_active_user),
):
    service = ImageService(repo)
    try:
        result = await service.generate(current_user.id, body.prompt, body.size)
    except ImageGenDisabledError:
        raise HTTPException(
            status_code=503, detail="이미지 생성 기능이 비활성화되어 있습니다."
        )
    except ImageQuotaExceededError as exc:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "7일 동안 최대 3회까지만 이미지를 생성할 수 있습니다.",
                "remaining": exc.remaining,
                "reset_at": exc.reset_at.isoformat() if exc.reset_at else None,
            },
        )
    except ImageGenFailedError:
        raise HTTPException(status_code=502, detail="이미지 생성에 실패했습니다.")
    return result


@router.get("/tmp/{token}")
async def get_tmp_image(
    token: str,
    current_user: User = Depends(get_current_active_user),
):
    """본인 발급 임시 이미지 미리보기 (생성 직후). token→owner는 {user_id}/{token} 격리로 보장."""
    path = tmp_file_path(current_user.id, token)
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")
    return FileResponse(path=path)
