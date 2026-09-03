"""In-memory WebSocket fan-out for newly persisted audit events."""

from collections import defaultdict

from fastapi import WebSocket


class AuditLogStream:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, workspace_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[workspace_id].add(websocket)

    def disconnect(self, workspace_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(workspace_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(workspace_id, None)

    async def publish(self, workspace_id: str, event: dict[str, object]) -> None:
        stale_connections: list[WebSocket] = []
        for websocket in self._connections.get(workspace_id, set()).copy():
            try:
                await websocket.send_json(event)
            except RuntimeError:
                stale_connections.append(websocket)
        for websocket in stale_connections:
            self.disconnect(workspace_id, websocket)


audit_log_stream = AuditLogStream()
