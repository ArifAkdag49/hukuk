"""Postgres erişimi.

Senkron havuz bilinçli bir seçim: Windows'ta psycopg'nin asenkron sürümü
SelectorEventLoop isterken MCP alt süreçleri ProactorEventLoop istiyor; ikisi
aynı döngüde yaşayamıyor. Tek kullanıcılı bir sunucuda senkron sorgular
yeterli. Asenkron kod içinden `await run(fn, ...)` ile iş parçacığında çağrılır.
"""

from typing import Any, Callable

import anyio
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def open_pool(url: str) -> None:
    global _pool
    _pool = ConnectionPool(url, min_size=1, max_size=5, kwargs={"row_factory": dict_row}, open=True)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def pool() -> ConnectionPool:
    assert _pool is not None, "veritabanı havuzu açılmadı"
    return _pool


def fetch_all(sql: str, params: Any = None) -> list[dict]:
    with pool().connection() as conn:
        return conn.execute(sql, params).fetchall()


def fetch_one(sql: str, params: Any = None) -> dict | None:
    with pool().connection() as conn:
        return conn.execute(sql, params).fetchone()


def execute(sql: str, params: Any = None) -> None:
    with pool().connection() as conn:
        conn.execute(sql, params)


def json(value: Any) -> Jsonb:
    return Jsonb(value)


async def run(fn: Callable, *args: Any) -> Any:
    return await anyio.to_thread.run_sync(fn, *args)


def bump_kb_version() -> str:
    row = fetch_one(
        "update kb_meta set value = (value::bigint + 1)::text "
        "where key = 'kb_version' returning value"
    )
    return row["value"]
