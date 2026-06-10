from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.services.chatbot import chatbot_service
from app.limiter import limiter

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatRequest(BaseModel):
    question: str
    session_id: str = ""  # 빈 문자열이면 히스토리 없이 단발 질문


class ChatResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=ChatResponse)
@limiter.limit("3/minute")
async def ask(request: Request, body: ChatRequest) -> ChatResponse:
    answer = await chatbot_service.ask(body.question, body.session_id)
    return ChatResponse(answer=answer)
