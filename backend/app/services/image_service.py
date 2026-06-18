import base64
import logging
import os
import re
import uuid
from datetime import datetime, timedelta

from app.config import settings
from app.repository.image_generation_repository import ImageGenerationRepository

logger = logging.getLogger(__name__)

# token(임시 stored 파일명) 화이트리스트: uuid hex + 허용 확장자
_TOKEN_RE = re.compile(r"^[0-9a-fA-F]{32}\.(png|jpg|jpeg|webp)$")
_EXT_BY_CONTENT_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


class ImageGenDisabledError(Exception):
    """OpenAI API 키 미설정 등으로 이미지 생성 기능이 비활성화된 경우 (503)."""


class ImageQuotaExceededError(Exception):
    """롤링 윈도우 내 생성 한도 초과 (429)."""

    def __init__(self, remaining: int, reset_at: datetime | None) -> None:
        self.remaining = remaining
        self.reset_at = reset_at
        super().__init__("이미지 생성 한도를 초과했습니다.")


class ImageGenFailedError(Exception):
    """OpenAI Images API 호출 실패 (502)."""


def is_valid_token(token: str) -> bool:
    """경로 조작 방지: basename + uuid/ext 화이트리스트 검증."""
    if not token or token != os.path.basename(token):
        return False
    return bool(_TOKEN_RE.match(token))


def _user_tmp_dir(user_id: uuid.UUID) -> str:
    return os.path.join(settings.UPLOAD_DIR, settings.IMAGE_TMP_SUBDIR, str(user_id))


def tmp_file_path(user_id: uuid.UUID, token: str) -> str | None:
    """본인 발급 token에 대한 임시 파일 절대 경로. 유효하지 않으면 None."""
    if not is_valid_token(token):
        return None
    return os.path.join(_user_tmp_dir(user_id), token)


def _compute_reset_at(oldest_created_at: datetime | None) -> datetime | None:
    if oldest_created_at is None:
        return None
    return oldest_created_at + timedelta(hours=settings.IMAGE_GEN_WINDOW_HOURS)


class ImageService:
    def __init__(self, repo: ImageGenerationRepository) -> None:
        self.repo = repo

    async def get_quota(self, user_id: uuid.UUID) -> dict:
        """현재 사용량/잔여/리셋 시각."""
        window = settings.IMAGE_GEN_WINDOW_HOURS
        used = await self.repo.count_recent(user_id, window)
        oldest = await self.repo.get_oldest_active(user_id, window)
        remaining = max(0, settings.IMAGE_GEN_LIMIT - used)
        return {
            "used": used,
            "remaining": remaining,
            "limit": settings.IMAGE_GEN_LIMIT,
            "reset_at": _compute_reset_at(oldest.created_at if oldest else None),
        }

    async def generate(self, user_id: uuid.UUID, prompt: str, size: str) -> dict:
        """한도검사 → OpenAI 호출 → 임시저장 → 차감 기록 → 응답 조립.

        MissingGreenlet 회피: 모든 읽기(count/oldest)를 commit(create) 이전에 수행.
        """
        if not settings.OPENAI_API_KEY:
            raise ImageGenDisabledError()

        window = settings.IMAGE_GEN_WINDOW_HOURS
        limit = settings.IMAGE_GEN_LIMIT

        # 1) 조회 먼저 (commit 이전) — count + oldest 모두 여기서 확보 (MissingGreenlet 회피)
        count = await self.repo.count_recent(user_id, window)
        oldest = await self.repo.get_oldest_active(user_id, window)
        if count >= limit:
            raise ImageQuotaExceededError(
                remaining=0,
                reset_at=_compute_reset_at(oldest.created_at if oldest else None),
            )

        # 2) OpenAI Images API 호출 (실패 시 502, 기록 없음)
        image_bytes, content_type = await self._call_openai(prompt, size)

        # 3) 임시 파일 디스크 저장
        ext = _EXT_BY_CONTENT_TYPE.get(content_type, ".png")
        token = f"{uuid.uuid4().hex}{ext}"
        tmp_dir = _user_tmp_dir(user_id)
        os.makedirs(tmp_dir, exist_ok=True)
        file_path = os.path.join(tmp_dir, token)
        with open(file_path, "wb") as f:
            f.write(image_bytes)

        # 4) 차감 확정 (insert + commit)
        record = await self.repo.create(
            user_id=user_id, prompt=prompt, stored_filename=token
        )

        # reset_at: 윈도우 내 가장 오래된 활성 기록 기준.
        # 이번 생성이 첫 기록이면 방금 insert된 record가 가장 오래된 것.
        oldest_created = oldest.created_at if oldest else record.created_at
        remaining = max(0, limit - (count + 1))
        return {
            "token": token,
            "preview_url": f"/api/v1/images/tmp/{token}",
            "original_filename": f"ai-generated-{token}",
            "content_type": content_type,
            "remaining": remaining,
            "limit": limit,
            "reset_at": _compute_reset_at(oldest_created),
        }

    async def _call_openai(self, prompt: str, size: str) -> tuple[bytes, str]:
        """OpenAI Images API 호출 → (bytes, content_type). gpt-image-1 계열은 b64_json 반환."""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            result = await client.images.generate(
                model=settings.OPENAI_IMAGE_MODEL,
                prompt=prompt,
                size=size,
                n=1,
            )
            data = result.data[0]
            b64 = getattr(data, "b64_json", None)
            if b64:
                return base64.b64decode(b64), "image/png"
            # 일부 모델은 URL 반환 — 다운로드 폴백
            url = getattr(data, "url", None)
            if url:
                import httpx

                async with httpx.AsyncClient() as http:
                    resp = await http.get(url)
                    resp.raise_for_status()
                    ct = resp.headers.get("content-type", "image/png").split(";")[0]
                    return resp.content, ct
            raise ImageGenFailedError("OpenAI 응답에 이미지 데이터가 없습니다.")
        except ImageGenFailedError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("OpenAI Images 호출 실패: %s", exc)
            raise ImageGenFailedError(str(exc)) from exc
