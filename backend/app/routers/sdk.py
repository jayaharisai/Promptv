"""Read-only endpoints intended for applications using Promptv access keys."""

import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessKey, Folder, Prompt, PromptVersion
from ..schemas import SDKFolderRead, SDKPromptRead

router = APIRouter(prefix="/sdk", tags=["sdk"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid Promptv access key is required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_access_key(
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> AccessKey:
    """Authenticate either ``Authorization: Bearer <key>`` or ``X-API-Key``."""
    token = x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        raise unauthorized()

    key = db.scalar(select(AccessKey).where(AccessKey.token_hash == hashlib.sha256(token.encode()).hexdigest()))
    if key is None:
        raise unauthorized()

    key.last_used_at = utc_now()
    key.request_count += 1
    db.commit()
    return key


@router.get("/folders", response_model=list[SDKFolderRead])
def list_folders(access_key: AccessKey = Depends(get_access_key), db: Session = Depends(get_db)) -> list[Folder]:
    """List folders belonging to the workspace associated with the access key."""
    return list(
        db.scalars(
            select(Folder)
            .where(Folder.workspace_id == access_key.workspace_id)
            .order_by(Folder.name.asc())
        )
    )


@router.get("/prompts/{folder_name}/{prompt_name}", response_model=SDKPromptRead)
def get_active_prompt(
    folder_name: str,
    prompt_name: str,
    access_key: AccessKey = Depends(get_access_key),
    db: Session = Depends(get_db),
) -> SDKPromptRead:
    """Return the currently active version of a prompt in the key's workspace."""
    folder = db.scalar(
        select(Folder).where(Folder.workspace_id == access_key.workspace_id, Folder.name == folder_name)
    )
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

    prompt = db.scalar(select(Prompt).where(Prompt.folder_id == folder.id, Prompt.name == prompt_name))
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found.")
    if prompt.status != "published" or prompt.active_version_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active published prompt was found.")

    version = db.get(PromptVersion, prompt.active_version_id)
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active prompt version not found.")

    return SDKPromptRead(
        id=prompt.id,
        name=prompt.name,
        description=prompt.description,
        folder=folder.name,
        version=version.number,
        content=version.content,
        updated_at=prompt.updated_at,
    )
