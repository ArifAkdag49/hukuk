import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .config import get_settings
from .routers import auth as auth_router
from .routers import kb


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        s = get_settings()
        os.makedirs(s.upload_dir, exist_ok=True)
        db.open_pool(s.database_url)
        try:
            yield
        finally:
            db.close_pool()

    app = FastAPI(title="Hukuk Çalışma API", lifespan=lifespan)

    @app.get("/health")
    def health():
        return {"ok": True}

    app.include_router(auth_router.router)
    app.include_router(kb.router)
    return app


app = create_app()
