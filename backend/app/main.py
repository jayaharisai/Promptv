from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from .config import get_settings
from .database import Base, engine
from .models import Workspace
from .routers import access_keys, audit_logs, folders, prompts, sdk, workspaces
from .schemas import StatusRead


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    existing_columns = {column["name"] for column in inspect(engine).get_columns("audit_logs")}
    additions = {"folder_id": "VARCHAR(36)", "prompt_id": "VARCHAR(36)", "integration": "VARCHAR(48) DEFAULT 'Direct API'", "system_prompt_tokens": "INTEGER"}
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in existing_columns:
                connection.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {name} {definition}"))
    with Session(engine) as db:
        has_workspace = db.scalar(select(Workspace.id).limit(1)) is not None
        if not has_workspace:
            db.add(Workspace(
                name="Default",
                description="The default workspace created for this fresh Promptv environment.",
            ))
            db.commit()
    yield


app = FastAPI(title=get_settings().app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/status", response_model=StatusRead, tags=["system"])
def read_status() -> StatusRead:
    return StatusRead(status="ok", service="promptv-api")


app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(folders.router, prefix="/api/v1")
app.include_router(prompts.router, prefix="/api/v1")
app.include_router(access_keys.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")
app.include_router(sdk.router, prefix="/api/v1")
