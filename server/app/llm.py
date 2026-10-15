"""Claude API sarmalayıcısı: maliyet hesabı, kullanım kaydı, aylık tavan.

Her çağrı `api_usage` tablosuna yazılır; uygulamanın ayarlar ekranı ve aylık
tavan bu tablodan okunur.
"""

from typing import Any

import anthropic
from fastapi import HTTPException

from . import db
from .config import get_settings

OPUS = "claude-opus-5-5"
SONNET = "claude-sonnet-5-5"
HAIKU = "claude-haiku-5-5"

# USD / 1M token: (girdi, çıktı, önbellek okuma). Önbellek yazma = girdi * 1,25.
PRICES: dict[str, tuple[float, float, float]] = {
    OPUS: (4.0, 20.0, 0.20),
    SONNET: (2.0, 10.0, 0.20),
    HAIKU: (0.10, 0.50, 0.01),
}

LIMIT_MESSAGE = "Bu ayın API limiti doldu"

_client: Any = None


def set_client(client: Any) -> None:
    """Testler sahte istemci takar; None gerçek istemciye döndürür."""
    global _client
    _client = client


def client() -> Any:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key, max_retries=3)
    return _client


def cost_usd(model: str, usage: Any) -> float:
    pin, pout, pcache = PRICES.get(model, PRICES[OPUS])
    i = getattr(usage, "input_tokens", 0) or 0
    o = getattr(usage, "output_tokens", 0) or 0
    cr = getattr(usage, "cache_read_input_tokens", 0) or 0
    cw = getattr(usage, "cache_creation_input_tokens", 0) or 0
    # 1 saatlik önbellek yazımı girdi fiyatının 2 katı, 5 dakikalık 1,25 katı
    detail = getattr(usage, "cache_creation", None)
    cw_1h = (getattr(detail, "ephemeral_1h_input_tokens", 0) or 0) if detail is not None else 0
    cw_5m = max(cw - cw_1h, 0)
    return (i * pin + o * pout + cr * pcache + cw_1h * pin * 2 + cw_5m * pin * 1.25) / 1_000_000


def month_total() -> float:
    row = db.fetch_one(
        "select coalesce(sum(cost_usd), 0) as total from api_usage "
        "where created_at >= date_trunc('month', now())"
    )
    return float(row["total"])


def check_budget() -> None:
    if month_total() >= get_settings().ai_monthly_cap_usd:
        raise HTTPException(402, LIMIT_MESSAGE)


async def ensure_budget() -> None:
    await db.run(check_budget)


def record(feature: str, model: str, usage: Any) -> None:
    db.execute(
        "insert into api_usage (feature, model, input_tokens, output_tokens, cache_read_tokens, "
        "cache_write_tokens, cost_usd) values (%s, %s, %s, %s, %s, %s, %s)",
        [
            feature,
            model,
            getattr(usage, "input_tokens", 0) or 0,
            getattr(usage, "output_tokens", 0) or 0,
            getattr(usage, "cache_read_input_tokens", 0) or 0,
            getattr(usage, "cache_creation_input_tokens", 0) or 0,
            cost_usd(model, usage),
        ],
    )


class RefusalError(RuntimeError):
    pass


def _check_refusal(resp: Any) -> None:
    if getattr(resp, "stop_reason", None) == "refusal":
        raise RefusalError("Model bu isteği yanıtlamadı")


async def create(feature: str, **kwargs: Any) -> Any:
    await ensure_budget()
    resp = await client().messages.create(**kwargs)
    await db.run(record, feature, kwargs["model"], resp.usage)
    _check_refusal(resp)
    return resp


async def parse(feature: str, output_format: type, **kwargs: Any) -> Any:
    """Yapılandırılmış çıktı: pydantic modeli döner."""
    await ensure_budget()
    resp = await client().messages.parse(output_format=output_format, **kwargs)
    await db.run(record, feature, kwargs["model"], resp.usage)
    _check_refusal(resp)
    if resp.parsed_output is None:
        raise RuntimeError(f"Model geçerli çıktı üretmedi (stop_reason={resp.stop_reason})")
    return resp.parsed_output
