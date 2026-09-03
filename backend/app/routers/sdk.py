"""Read-only endpoints intended for applications using Promptv access keys."""

import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
import tiktoken
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..audit_stream import audit_log_stream
from ..models import AccessKey, AuditLog, Folder, Prompt, PromptVersion
from ..schemas import AuditLogRead, SDKFolderRead, SDKPromptRead

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


def record_access(
    db: Session,
    access_key: AccessKey,
    action: str,
    resource_type: str,
    resource_name: str | None,
    status_code: int,
    folder_id: str | None = None,
    prompt_id: str | None = None,
    integration: str = "Direct API",
    system_prompt_tokens: int | None = None,
) -> AuditLog:
    entry = AuditLog(
        workspace_id=access_key.workspace_id,
        access_key_id=access_key.id,
        access_key_name=access_key.name,
        action=action,
        resource_type=resource_type,
        resource_name=resource_name,
        folder_id=folder_id,
        prompt_id=prompt_id,
        integration=integration[:48],
        system_prompt_tokens=system_prompt_tokens,
        status_code=status_code,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


async def record_and_publish_access(
    db: Session,
    access_key: AccessKey,
    action: str,
    resource_type: str,
    resource_name: str | None,
    status_code: int,
    folder_id: str | None = None,
    prompt_id: str | None = None,
    integration: str = "Direct API",
    system_prompt_tokens: int | None = None,
) -> None:
    entry = record_access(db, access_key, action, resource_type, resource_name, status_code, folder_id, prompt_id, integration, system_prompt_tokens)
    await audit_log_stream.publish(
        access_key.workspace_id,
        AuditLogRead.model_validate(entry).model_dump(mode="json"),
    )


@router.get("/folders", response_model=list[SDKFolderRead])
async def list_folders(access_key: AccessKey = Depends(get_access_key), x_promptv_integration: Annotated[str | None, Header()] = None, db: Session = Depends(get_db)) -> list[Folder]:
    """List folders belonging to the workspace associated with the access key."""
    folders = list(
        db.scalars(
            select(Folder)
            .where(Folder.workspace_id == access_key.workspace_id)
            .order_by(Folder.name.asc())
        )
    )
    await record_and_publish_access(db, access_key, "list_folders", "workspace", None, status.HTTP_200_OK, integration=x_promptv_integration or "Direct API")
    return folders


@router.get("/prompts/{folder_name}/{prompt_name}", response_model=SDKPromptRead)
async def get_active_prompt(
    folder_name: str,
    prompt_name: str,
    access_key: AccessKey = Depends(get_access_key),
    x_promptv_integration: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> SDKPromptRead:
    """Return the currently active version of a prompt in the key's workspace."""
    folder = db.scalar(
        select(Folder).where(Folder.workspace_id == access_key.workspace_id, Folder.name == folder_name)
    )
    if folder is None:
        await record_and_publish_access(db, access_key, "get_active_prompt", "folder", folder_name, status.HTTP_404_NOT_FOUND)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

    prompt = db.scalar(select(Prompt).where(Prompt.folder_id == folder.id, Prompt.name == prompt_name))
    if prompt is None:
        await record_and_publish_access(db, access_key, "get_active_prompt", "prompt", f"{folder_name}/{prompt_name}", status.HTTP_404_NOT_FOUND)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found.")
    if prompt.status != "published" or prompt.active_version_id is None:
        await record_and_publish_access(db, access_key, "get_active_prompt", "prompt", f"{folder_name}/{prompt_name}", status.HTTP_404_NOT_FOUND)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active published prompt was found.")

    version = db.get(PromptVersion, prompt.active_version_id)
    if version is None:
        await record_and_publish_access(db, access_key, "get_active_prompt", "prompt", f"{folder_name}/{prompt_name}", status.HTTP_404_NOT_FOUND)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active prompt version not found.")

    tokens = len(tiktoken.get_encoding("cl100k_base").encode(version.content))
    await record_and_publish_access(db, access_key, "get_active_prompt", "prompt", f"{folder.name}/{prompt.name}", status.HTTP_200_OK, folder.id, prompt.id, x_promptv_integration or "Direct API", tokens)
    return SDKPromptRead(
        id=prompt.id,
        name=prompt.name,
        description=prompt.description,
        folder=folder.name,
        version=version.number,
        content=version.content,
        updated_at=prompt.updated_at,
    )
