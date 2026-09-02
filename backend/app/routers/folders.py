from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import cache
from ..database import get_db
from ..models import Folder, Workspace
from ..schemas import FolderCreate, FolderRead, FolderUpdate

router = APIRouter(tags=["folders"])


def folder_cache_key(workspace_id: str) -> str:
    return f"workspace:{workspace_id}:folders"


def get_workspace_or_404(workspace_id: str, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return workspace


def get_folder_or_404(folder_id: str, db: Session) -> Folder:
    folder = db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return folder


@router.get("/workspaces/{workspace_id}/folders", response_model=list[FolderRead])
def list_folders(workspace_id: str, db: Session = Depends(get_db)) -> list[FolderRead]:
    get_workspace_or_404(workspace_id, db)
    cache_key = folder_cache_key(workspace_id)
    cached_folders = cache.get_json(cache_key)
    if cached_folders is not None:
        return [FolderRead.model_validate(folder) for folder in cached_folders]

    folders = list(db.scalars(select(Folder).where(Folder.workspace_id == workspace_id).order_by(Folder.created_at.desc())))
    serialized_folders = [FolderRead.model_validate(folder) for folder in folders]
    cache.set_json(cache_key, [folder.model_dump(mode="json") for folder in serialized_folders])
    return serialized_folders


@router.post("/workspaces/{workspace_id}/folders", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(workspace_id: str, payload: FolderCreate, db: Session = Depends(get_db)) -> Folder:
    get_workspace_or_404(workspace_id, db)
    folder = Folder(workspace_id=workspace_id, name=payload.name, description=payload.description)
    db.add(folder)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A folder with this name already exists in the workspace.") from error
    db.refresh(folder)
    cache.delete(folder_cache_key(workspace_id))
    return folder


@router.get("/folders/{folder_id}", response_model=FolderRead)
def get_folder(folder_id: str, db: Session = Depends(get_db)) -> Folder:
    return get_folder_or_404(folder_id, db)


@router.patch("/folders/{folder_id}", response_model=FolderRead)
def update_folder(folder_id: str, payload: FolderUpdate, db: Session = Depends(get_db)) -> Folder:
    folder = get_folder_or_404(folder_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(folder, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A folder with this name already exists in the workspace.") from error
    db.refresh(folder)
    cache.delete(folder_cache_key(folder.workspace_id))
    return folder


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: str, db: Session = Depends(get_db)) -> Response:
    folder = get_folder_or_404(folder_id, db)
    workspace_id = folder.workspace_id
    db.delete(folder)
    db.commit()
    cache.delete(folder_cache_key(workspace_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
