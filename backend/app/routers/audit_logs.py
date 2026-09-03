from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..audit_stream import audit_log_stream
from ..models import AuditLog, Folder, Workspace
from ..schemas import AuditLogPage, AuditLogRead, FolderTokenUsageRead

router = APIRouter(tags=["audit logs"])


@router.get("/workspaces/{workspace_id}/audit-logs", response_model=AuditLogPage)
def list_audit_logs(
    workspace_id: str,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> AuditLogPage:
    if db.get(Workspace, workspace_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    total = db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.workspace_id == workspace_id)) or 0
    items = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return AuditLogPage(items=items, total=total, limit=limit, offset=offset, has_more=offset + len(items) < total)


@router.websocket("/ws/workspaces/{workspace_id}/audit-logs")
async def stream_audit_logs(websocket: WebSocket, workspace_id: str) -> None:
    """Push newly stored audit events to dashboards viewing this workspace."""
    await audit_log_stream.connect(workspace_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        audit_log_stream.disconnect(workspace_id, websocket)


@router.get("/folders/{folder_id}/token-usage", response_model=FolderTokenUsageRead)
def folder_token_usage(folder_id: str, start: datetime | None = None, end: datetime | None = None, db: Session = Depends(get_db)) -> FolderTokenUsageRead:
    if db.get(Folder, folder_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    query = select(AuditLog).where(AuditLog.folder_id == folder_id, AuditLog.system_prompt_tokens.is_not(None))
    if start:
        query = query.where(AuditLog.created_at >= start)
    if end:
        query = query.where(AuditLog.created_at < end)
    events = list(db.scalars(query.order_by(AuditLog.created_at.desc()).limit(500)))
    return FolderTokenUsageRead(total_requests=len(events), total_system_prompt_tokens=sum(event.system_prompt_tokens or 0 for event in events), events=list(reversed(events)))
