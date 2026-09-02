from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import cache
from ..database import get_db
from ..models import Folder, Prompt, PromptVersion
from ..schemas import ActiveVersionUpdate, PromptCreate, PromptRead, PromptUpdate, PromptVersionCreate, PromptVersionRead

router = APIRouter(tags=["prompts"])


def prompt_cache_key(folder_id: str) -> str:
    return f"folder:{folder_id}:prompts"


def get_folder_or_404(folder_id: str, db: Session) -> Folder:
    folder = db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return folder


def get_prompt_or_404(prompt_id: str, db: Session) -> Prompt:
    prompt = db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found.")
    return prompt


def get_version_or_404(version_id: str, prompt_id: str, db: Session) -> PromptVersion:
    version = db.get(PromptVersion, version_id)
    if version is None or version.prompt_id != prompt_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt version not found.")
    return version


@router.get("/folders/{folder_id}/prompts", response_model=list[PromptRead])
def list_prompts(folder_id: str, db: Session = Depends(get_db)) -> list[PromptRead]:
    get_folder_or_404(folder_id, db)
    cache_key = prompt_cache_key(folder_id)
    cached_prompts = cache.get_json(cache_key)
    if cached_prompts is not None:
        return [PromptRead.model_validate(prompt) for prompt in cached_prompts]

    prompts = list(db.scalars(select(Prompt).where(Prompt.folder_id == folder_id).order_by(Prompt.updated_at.desc())))
    serialized_prompts = [PromptRead.model_validate(prompt) for prompt in prompts]
    cache.set_json(cache_key, [prompt.model_dump(mode="json") for prompt in serialized_prompts])
    return serialized_prompts


@router.post("/folders/{folder_id}/prompts", response_model=PromptRead, status_code=status.HTTP_201_CREATED)
def create_prompt(folder_id: str, payload: PromptCreate, db: Session = Depends(get_db)) -> Prompt:
    get_folder_or_404(folder_id, db)
    prompt = Prompt(folder_id=folder_id, name=payload.name, description=payload.description, status=payload.status)
    db.add(prompt)
    db.flush()
    first_version = PromptVersion(prompt_id=prompt.id, number=1, content=payload.content, note="Initial version")
    db.add(first_version)
    db.flush()
    prompt.active_version_id = first_version.id
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A prompt with this name already exists in the folder.") from error
    db.refresh(prompt)
    cache.delete(prompt_cache_key(folder_id))
    return prompt


@router.get("/prompts/{prompt_id}", response_model=PromptRead)
def get_prompt(prompt_id: str, db: Session = Depends(get_db)) -> Prompt:
    return get_prompt_or_404(prompt_id, db)


@router.patch("/prompts/{prompt_id}", response_model=PromptRead)
def update_prompt(prompt_id: str, payload: PromptUpdate, db: Session = Depends(get_db)) -> Prompt:
    prompt = get_prompt_or_404(prompt_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prompt, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A prompt with this name already exists in the folder.") from error
    db.refresh(prompt)
    cache.delete(prompt_cache_key(prompt.folder_id))
    return prompt


@router.delete("/prompts/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(prompt_id: str, db: Session = Depends(get_db)) -> Response:
    prompt = get_prompt_or_404(prompt_id, db)
    folder_id = prompt.folder_id
    db.delete(prompt)
    db.commit()
    cache.delete(prompt_cache_key(folder_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/prompts/{prompt_id}/versions", response_model=list[PromptVersionRead])
def list_versions(prompt_id: str, db: Session = Depends(get_db)) -> list[PromptVersion]:
    get_prompt_or_404(prompt_id, db)
    return list(db.scalars(select(PromptVersion).where(PromptVersion.prompt_id == prompt_id).order_by(PromptVersion.number.desc())))


@router.post("/prompts/{prompt_id}/versions", response_model=PromptVersionRead, status_code=status.HTTP_201_CREATED)
def create_version(prompt_id: str, payload: PromptVersionCreate, db: Session = Depends(get_db)) -> PromptVersion:
    prompt = get_prompt_or_404(prompt_id, db)
    latest_number = db.scalar(select(func.max(PromptVersion.number)).where(PromptVersion.prompt_id == prompt_id)) or 0
    version = PromptVersion(prompt_id=prompt_id, number=latest_number + 1, content=payload.content, note=payload.note or "New version")
    db.add(version)
    db.commit()
    db.refresh(version)
    cache.delete(prompt_cache_key(prompt.folder_id))
    return version


@router.patch("/prompts/{prompt_id}/active-version", response_model=PromptRead)
def set_active_version(prompt_id: str, payload: ActiveVersionUpdate, db: Session = Depends(get_db)) -> Prompt:
    prompt = get_prompt_or_404(prompt_id, db)
    get_version_or_404(payload.version_id, prompt_id, db)
    prompt.active_version_id = payload.version_id
    db.commit()
    db.refresh(prompt)
    cache.delete(prompt_cache_key(prompt.folder_id))
    return prompt
