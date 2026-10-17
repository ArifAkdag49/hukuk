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


MADDE_123 = """Kişilerin huzur ve sükununu bozma
Madde 123- (1) Sırf huzur ve sükununu bozmak maksadıyla belli bir kişiye ısrarla telefon edilmesi halinde faile üç aydan bir yıla kadar hapis cezası verilir.
Israrlı takip
MADDE 123/A- (Ek:12/5/2022-7406/8 md.)
(1) Israrlı bir şekilde takip eden faile altı aydan iki yıla kadar hapis cezası verilir.
(2) Suçun çocuğa karşı işlenmesi hâlinde ceza artırılır."""


def test_lettered_article_is_split_from_its_base_article():
    base, ekler = mevzuat.split_ek_maddeler(MADDE_123, "123")
    assert base.endswith("hapis cezası verilir.") and "Israrlı" not in base
    assert ekler["A"].startswith("Israrlı takip\nMADDE 123/A-") and ekler["A"].endswith("ceza artırılır.")


def test_trailing_section_heading_before_footnotes_is_dropped():
    html = ("<p>MADDE 5- (1) Ticari davalarda asliye ticaret mahkemesi görevlidir.[7]</p>"
            "<p>B) Çeşitli hükümler</p><p>[7] 26/6/2012 tarihli ve 6335 sayılı Kanunla değiştirilmiştir.</p>")
    assert mevzuat.html_to_text(html) == (
        "MADDE 5- (1) Ticari davalarda asliye ticaret mahkemesi görevlidir.[7]\n"
        "[7] 26/6/2012 tarihli ve 6335 sayılı Kanunla değiştirilmiştir.")


def test_footnotes_stay_with_the_base_article():
    text = "MADDE 5- (1) Görev.[7]\nDava şartı olarak arabuluculuk\nMADDE 5/A- (1) Arabulucuya başvurulur.\n[7] Değişik."
    base, ekler = mevzuat.split_ek_maddeler(text, "5")
    assert base == "MADDE 5- (1) Görev.[7]\n[7] Değişik."
    assert ekler["A"] == "Dava şartı olarak arabuluculuk\nMADDE 5/A- (1) Arabulucuya başvurulur."


def test_text_without_lettered_articles_is_unchanged():
    base, ekler = mevzuat.split_ek_maddeler("Cinsel saldırı\nMadde 102- (1) ...", "102")
    assert base == "Cinsel saldırı\nMadde 102- (1) ..." and ekler == {}


def test_client_errors_other_than_rate_limit_are_not_retried(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(404)

    _patch(monkeypatch, handler)
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(mevzuat._post("searchDocuments", {}))
    assert len(calls) == 1
