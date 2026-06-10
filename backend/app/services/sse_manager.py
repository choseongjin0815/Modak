import asyncio
import logging
import uuid

logger = logging.getLogger(__name__)


class SSEManager:
    """유저별 SSE 연결(Queue) 관리. 탭 여러 개를 위해 list로 관리."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, list[asyncio.Queue]] = {}

    def register(self, user_id: uuid.UUID) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._connections.setdefault(user_id, []).append(queue)
        logger.debug("SSE 연결 등록: user_id=%s (총 연결: %d)", user_id, self.connected_count)
        return queue

    def unregister(self, user_id: uuid.UUID, queue: asyncio.Queue) -> None:
        conns = self._connections.get(user_id, [])
        try:
            conns.remove(queue)
        except ValueError:
            pass
        if not conns:
            self._connections.pop(user_id, None)
        logger.debug("SSE 연결 해제: user_id=%s (총 연결: %d)", user_id, self.connected_count)

    async def push(self, user_id: uuid.UUID, data: dict) -> None:
        conns = self._connections.get(user_id, [])
        if conns:
            for queue in conns:
                await queue.put(data)
            logger.debug("SSE 푸시: user_id=%s, type=%s", user_id, data.get("type"))
        else:
            logger.debug("SSE 푸시 대상 없음 (오프라인): user_id=%s", user_id)

    @property
    def connected_count(self) -> int:
        return sum(len(v) for v in self._connections.values())


sse_manager = SSEManager()
