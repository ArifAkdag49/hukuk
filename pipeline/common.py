"""Hattın ortak altyapısı: .env, sunucu modülleri, veritabanı ve kaynak araçları."""

import os
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "pipeline" / "out"
CURRICULUM = ROOT / "pipeline" / "curriculum"

# Sunucunun app paketi (llm, mevzuat, mcp_hub, db) — tek fiyat tablosu, tek kaynak katmanı
sys.path.insert(0, str(ROOT / "server"))


def load_env() -> None:
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def courses() -> list[dict]:
    data = yaml.safe_load((ROOT / "pipeline" / "courses.yaml").read_text(encoding="utf-8"))
    return data["courses"]


def course(course_id: str) -> dict:
    for c in courses():
        if c["id"] == course_id:
            return c
    raise SystemExit(f"Bilinmeyen ders: {course_id}")


def course_row(c: dict) -> dict:
    return {"id": c["id"], "code": c["id"], "name": c["name"], "year": c["year"], "sort_order": c["sort_order"]}


class Runtime:
    """`async with Runtime() as rt:` → veritabanı havuzu (ve gerekirse içtihat MCP) açık."""

    def __init__(self, with_sources: bool = True):
        self.with_sources = with_sources

    async def __aenter__(self):
        load_env()
        from app import db
        from app.config import get_settings
        from app.mcp_hub import McpHub

        db.open_pool(get_settings().database_url)
        self.hub = McpHub()
        if self.with_sources:
            await self.hub.start()
        return self

    async def __aexit__(self, *exc):
        from app import db

        await self.hub.stop()
        db.close_pool()
