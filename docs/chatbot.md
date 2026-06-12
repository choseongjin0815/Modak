# Chatbot

`backend/app/services/chatbot.py` — LangChain + ChromaDB + OpenAI 기반 FAQ + DB 연동 챗봇.

## 동작

- **초기화:** `faq_data.json` → OpenAI 임베딩 → ChromaDB (인메모리). `llm.bind_tools(tools)`로 LLM에 tool 목록 바인딩. 서버 시작 시 lifespan에서 1회 실행.
- **Tool calling 루프 (직접 구현, LangGraph 미사용):** LLM 호출 → `response.tool_calls` 확인 → tool 실행 → `ToolMessage`로 결과 전달 → 최종 답변. 최대 3회 반복.
- **Tool 5개:** `search_faq`(ChromaDB), `search_posts`(DB 키워드 검색), `get_popular_posts`(조회수순), `get_latest_posts`(최신순), `get_board_stats`(통계).
- **`_CATEGORY_GROUPS`:** 자연어 그룹명("야구", "축구", "게임" 등) → slug 리스트 매핑.
- `OPENAI_API_KEY` 미설정 시 챗봇만 비활성화, 서버는 정상 기동.
- **Tool docstring:** LLM이 tool 선택 근거로 사용하므로 명확하게 한국어로 작성할 것.

## 엔드포인트

`POST /api/v1/chatbot/ask` — `{ "question": "...", "session_id": "..." }` → `{ "answer": "..." }` (인증 불필요).

## Rate Limiting (slowapi)

- `app/limiter.py`의 `Limiter`(싱글톤, `key_func=get_remote_address`)를 `main.py`에서 `app.state.limiter`에 등록 + `RateLimitExceeded` 핸들러 설정.
- 챗봇 `ask`에 `@limiter.limit("3/minute")` 적용 → 초과 시 HTTP 429.
- 데코레이터 적용 함수는 **첫 인자로 `request: Request` 필수.**
- `limiter`는 순환참조 방지를 위해 `app/main.py`가 아닌 `app/limiter.py`에 정의.
