"""Mevzuat servisi istemcisi: hız sınırında (429) bekleyip yeniden dener."""

import asyncio

import httpx
import pytest

from app import mevzuat

OK = {"metadata": {"FMTY": "SUCCESS"}, "data": {"ok": 1}}


def _patch(monkeypatch, handler):
    monkeypatch.setattr(mevzuat, "_transport", httpx.MockTransport(handler))
    monkeypatch.setattr(mevzuat, "RETRY_DELAYS", (0, 0, 0))


def test_rate_limited_request_is_retried(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request.url.path)
        if len(calls) < 3:
            return httpx.Response(429, headers={"Retry-After": "0"})
        return httpx.Response(200, json=OK)

    _patch(monkeypatch, handler)
    assert asyncio.run(mevzuat._post("searchDocuments", {})) == {"ok": 1}
    assert len(calls) == 3


def test_gives_up_after_retries(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(429)

    _patch(monkeypatch, handler)
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(mevzuat._post("searchDocuments", {}))
    assert len(calls) == 4  # ilk deneme + 3 yeniden deneme


def test_connection_errors_are_retried(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        if len(calls) < 3:
            raise httpx.ConnectError("bağlantı koptu", request=request)
        return httpx.Response(200, json=OK)

    _patch(monkeypatch, handler)
    assert asyncio.run(mevzuat._post("searchDocuments", {})) == {"ok": 1}
    assert len(calls) == 3


def test_client_errors_other_than_rate_limit_are_not_retried(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(404)

    _patch(monkeypatch, handler)
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(mevzuat._post("searchDocuments", {}))
    assert len(calls) == 1
