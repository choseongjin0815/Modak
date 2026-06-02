import asyncio
import uuid


class SSEManager:
    """유저별 SSE 연결(Queue) 관리. 탭 여러 개를 위해 list로 관리."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, list[asyncio.Queue]] = {}

    def register(self, user_id: uuid.UUID) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._connections.setdefault(user_id, []).append(queue)
        return queue

    def unregister(self, user_id: uuid.UUID, queue: asyncio.Queue) -> None:
        conns = self._connections.get(user_id, [])
        try:
            conns.remove(queue)
        except ValueError:
            pass
        if not conns:
            self._connections.pop(user_id, None)

    async def push(self, user_id: uuid.UUID, data: dict) -> None:
        for queue in self._connections.get(user_id, []):
            await queue.put(data)

    @property
    def connected_count(self) -> int:
        return sum(len(v) for v in self._connections.values())


sse_manager = SSEManager()
