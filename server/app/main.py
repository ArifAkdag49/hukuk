import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from . import db
from .config import get_settings
from .mcp_hub import hub
from .routers import auth as auth_router
from .routers import assistant, cases, kb, notes, progress, usage

log = logging.getLogger("hukuk")


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        s = get_settings()
        os.makedirs(s.upload_dir, exist_ok=True)
        db.open_pool(s.database_url)
        # önceki süreç not işlerken durduysa (deploy/çökme) not sonsuza dek "işleniyor" kalmasın
        db.execute(
            "update notes set status = 'failed', error = 'İşlem yarıda kaldı (sunucu yeniden başladı); notu yeniden yükleyin' "
            "where status = 'processing' and created_at < now() - interval '10 minutes'"
        )
        if s.mcp_enabled:
            try:
                await hub.start()
            except Exception:
                # içtihat servisi açılamazsa uygulama yine çalışır; araç "ulaşılamıyor" döner
                log.exception("içtihat MCP başlatılamadı")
        try:
            yield
        finally:
            await hub.stop()
            db.close_pool()

    app = FastAPI(title="Hukuk Çalışma API", lifespan=lifespan)
    app.add_middleware(GZipMiddleware, minimum_size=1000)  # bilgi bankası dışa aktarımı MB'larca JSON

    @app.get("/health")
    def health():
        return {"ok": True}

    app.include_router(auth_router.router)
    app.include_router(kb.router)
    app.include_router(progress.router)
    app.include_router(usage.router)
    app.include_router(cases.router)
    app.include_router(notes.router)
    app.include_router(assistant.router)
    return app


app = create_app()
