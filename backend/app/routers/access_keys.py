import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessKey, Workspace
from ..schemas import AccessKeyCreate, AccessKeyCreated, AccessKeyRead, AccessKeyUpdate

router = APIRouter(tags=["access keys"])


def get_workspace_or_404(workspace_id: str, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return workspace


def get_access_key_or_404(key_id: str, db: Session) -> AccessKey:
    key = db.get(AccessKey, key_id)
    if key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access key not found.")
    return key


def make_token() -> str:
    return f"pk_live_{secrets.token_urlsafe(32)}"


@router.get("/workspaces/{workspace_id}/access-keys", response_model=list[AccessKeyRead])
def list_access_keys(workspace_id: str, db: Session = Depends(get_db)) -> list[AccessKey]:
    get_workspace_or_404(workspace_id, db)
    return list(db.scalars(select(AccessKey).where(AccessKey.workspace_id == workspace_id).order_by(AccessKey.created_at.desc())))


@router.post("/workspaces/{workspace_id}/access-keys", response_model=AccessKeyCreated, status_code=status.HTTP_201_CREATED)
def create_access_key(workspace_id: str, payload: AccessKeyCreate, db: Session = Depends(get_db)) -> AccessKeyCreated:
    get_workspace_or_404(workspace_id, db)
    token = payload.token or make_token()
    key = AccessKey(
        workspace_id=workspace_id,
        name=payload.name,
        description=payload.description,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        token_prefix=token[:11],
        token_last4=token[-4:],
    )
    db.add(key)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An access key with this name already exists in the workspace.") from error
    db.refresh(key)
    return AccessKeyCreated(**AccessKeyRead.model_validate(key).model_dump(), token=token)


@router.get("/access-keys/{key_id}", response_model=AccessKeyRead)
def get_access_key(key_id: str, db: Session = Depends(get_db)) -> AccessKey:
    return get_access_key_or_404(key_id, db)


@router.patch("/access-keys/{key_id}", response_model=AccessKeyRead)
def update_access_key(key_id: str, payload: AccessKeyUpdate, db: Session = Depends(get_db)) -> AccessKey:
    key = get_access_key_or_404(key_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(key, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An access key with this name already exists in the workspace.") from error
    db.refresh(key)
    return key


@router.delete("/access-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_access_key(key_id: str, db: Session = Depends(get_db)) -> Response:
    key = get_access_key_or_404(key_id, db)
    db.delete(key)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
