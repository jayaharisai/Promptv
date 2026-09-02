from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Workspace
from ..schemas import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def get_workspace_or_404(workspace_id: str, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return workspace


@router.get("/", response_model=list[WorkspaceRead])
def list_workspaces(db: Session = Depends(get_db)) -> list[Workspace]:
    return list(db.scalars(select(Workspace).order_by(Workspace.created_at.desc())))


@router.post("/", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)) -> Workspace:
    workspace = Workspace(name=payload.name.strip(), description=payload.description.strip())
    db.add(workspace)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A workspace with this title already exists.") from error
    db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(workspace_id: str, db: Session = Depends(get_db)) -> Workspace:
    return get_workspace_or_404(workspace_id, db)


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(workspace_id: str, payload: WorkspaceUpdate, db: Session = Depends(get_db)) -> Workspace:
    workspace = get_workspace_or_404(workspace_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(workspace, field, value.strip() if isinstance(value, str) else value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A workspace with this title already exists.") from error
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(workspace_id: str, db: Session = Depends(get_db)) -> Response:
    workspace = get_workspace_or_404(workspace_id, db)
    if workspace.name == "Default":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The Default workspace cannot be deleted.")
    db.delete(workspace)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
