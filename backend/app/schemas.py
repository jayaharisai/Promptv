from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkspaceFields(BaseModel):
    @field_validator("name", "description", mode="before", check_fields=False)
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class WorkspaceCreate(WorkspaceFields):
    name: str = Field(min_length=5, max_length=18)
    description: str = Field(min_length=50, max_length=300)


class WorkspaceUpdate(WorkspaceFields):
    name: str | None = Field(default=None, min_length=5, max_length=18)
    description: str | None = Field(default=None, min_length=50, max_length=300)


class WorkspaceRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatusRead(BaseModel):
    status: str
    service: str


class FolderCreate(WorkspaceFields):
    name: str = Field(min_length=3, max_length=18)
    description: str = Field(min_length=20, max_length=350)


class FolderUpdate(WorkspaceFields):
    name: str | None = Field(default=None, min_length=3, max_length=18)
    description: str | None = Field(default=None, min_length=20, max_length=350)


class FolderRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PromptFields(BaseModel):
    @field_validator("name", "description", "content", "note", mode="before", check_fields=False)
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class PromptCreate(PromptFields):
    name: str = Field(min_length=3, max_length=30)
    description: str = Field(default="", max_length=140)
    content: str = Field(min_length=1, max_length=20000)
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")


class PromptUpdate(PromptFields):
    name: str | None = Field(default=None, min_length=3, max_length=30)
    description: str | None = Field(default=None, max_length=140)
    status: str | None = Field(default=None, pattern="^(draft|published|archived)$")


class PromptRead(BaseModel):
    id: str
    folder_id: str
    name: str
    description: str
    status: str
    active_version_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PromptVersionCreate(PromptFields):
    content: str = Field(min_length=1, max_length=20000)
    note: str = Field(default="", max_length=140)


class PromptVersionRead(BaseModel):
    id: str
    prompt_id: str
    number: int
    content: str
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActiveVersionUpdate(BaseModel):
    version_id: str


class AccessKeyFields(BaseModel):
    @field_validator("name", "description", mode="before", check_fields=False)
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class AccessKeyCreate(AccessKeyFields):
    name: str = Field(min_length=3, max_length=32)
    description: str = Field(min_length=10, max_length=160)
    token: str | None = Field(default=None, min_length=32, max_length=128)

    @field_validator("token")
    @classmethod
    def validate_token_prefix(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("pk_live_"):
            raise ValueError("Access keys must start with pk_live_.")
        return value


class AccessKeyUpdate(AccessKeyFields):
    name: str | None = Field(default=None, min_length=3, max_length=32)
    description: str | None = Field(default=None, min_length=10, max_length=160)


class AccessKeyRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str
    token_prefix: str
    token_last4: str
    last_used_at: datetime | None
    request_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccessKeyCreated(AccessKeyRead):
    token: str


class SDKFolderRead(BaseModel):
    id: str
    name: str
    description: str

    model_config = ConfigDict(from_attributes=True)


class SDKPromptRead(BaseModel):
    id: str
    name: str
    description: str
    folder: str
    version: int
    content: str
    updated_at: datetime
