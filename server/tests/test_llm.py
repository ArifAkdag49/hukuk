from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import llm, mcp_hub, mevzuat


def usage(i=0, o=0, cr=0, cw=0):
    return SimpleNamespace(
        input_tokens=i, output_tokens=o, cache_read_input_tokens=cr, cache_creation_input_tokens=cw
    )


def test_cost_opus_one_million_in_and_out_is_24_dollars():
    assert llm.cost_usd("claude-opus-5-5", usage(1_000_000, 1_000_000)) == pytest.approx(24.0)


def test_cost_counts_cache_reads_and_writes():
    # sonnet: 1M önbellek okuma 0,20$ + 1M önbellek yazma 2*1,25=2,5$
    assert llm.cost_usd("claude-sonnet-5-5", usage(cr=1_000_000, cw=1_000_000)) == pytest.approx(2.7)


def test_cost_handles_missing_cache_fields():
    u = SimpleNamespace(input_tokens=1_000_000, output_tokens=0, cache_read_input_tokens=None, cache_creation_input_tokens=None)
    assert llm.cost_usd("claude-haiku-5-5", u) == pytest.approx(0.10)


def test_budget_blocks_when_month_total_reaches_cap(client, sql):
    sql.execute("insert into api_usage (feature, model, cost_usd) values ('asistan','claude-opus-5-5', 50)")
    with pytest.raises(HTTPException) as e:
        llm.check_budget()
    assert e.value.status_code == 402


def test_budget_ignores_previous_months(client, sql):
    sql.execute(
        "insert into api_usage (feature, model, cost_usd, created_at) "
        "values ('asistan','claude-opus-5-5', 500, now() - interval '40 days')"
    )
    llm.check_budget()  # fırlatmamalı


class FakeMessages:
    def __init__(self):
        self.calls = []

    async def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(model=kw["model"], usage=usage(1000, 500), content=[], stop_reason="end_turn")


async def test_create_records_usage_row(client, sql):
    fake = SimpleNamespace(messages=FakeMessages())
    llm.set_client(fake)
    try:
        await llm.create("deneme", model="claude-haiku-5-5", max_tokens=10, messages=[])
    finally:
        llm.set_client(None)
    row = sql.execute("select feature, model, input_tokens, output_tokens, cost_usd from api_usage").fetchone()
    assert row[0] == "deneme" and row[1] == "claude-haiku-5-5"
    assert (row[2], row[3]) == (1000, 500)
    assert float(row[4]) == pytest.approx(0.00035)


def test_usage_month_endpoint(auth_client, sql):
    sql.execute("insert into api_usage (feature, model, cost_usd) values ('asistan','m', 1.5), ('asistan','m', 0.5), ('notlar','m', 1), ('pipeline:HUK2011:icerik','m', 7)")
    body = auth_client.get("/usage/month").json()
    assert body["cost_usd"] == pytest.approx(3.0)
    assert body["cap_usd"] == 50
    assert body["pipeline_cost_usd"] == pytest.approx(7.0)
    assert body["by_feature"] == {"asistan": pytest.approx(2.0), "notlar": pytest.approx(1.0)}


class BrokenSession:
    async def call_tool(self, name, args):
        raise RuntimeError("captcha")


async def test_hub_turns_mcp_failure_into_error_result():
    hub = mcp_hub.McpHub()
    hub._ictihat = BrokenSession()
    text, is_error = await hub.call("ictihat_ara", {"ifade": "x"})
    assert is_error
    assert "ulaşılamıyor" in text


async def test_hub_rejects_unknown_tool():
    text, is_error = await mcp_hub.McpHub().call("dosya_sil", {})
    assert is_error and "Bilinmeyen araç" in text


async def test_hub_reports_unavailable_when_mcp_not_started():
    text, is_error = await mcp_hub.McpHub().call("karar_getir", {"karar_id": "1"})
    assert is_error and "ulaşılamıyor" in text


def test_article_html_to_text_drops_following_heading():
    html = (
        '<p class="MsoNormal"><b>MADDE 49- </b>Kusurlu ve hukuka aykırı bir fiille başkasına zarar veren, '
        "bu zararı gidermekle yükümlüdür.</p><p>Zarar verici fiili &quot;yasaklayan&quot; bir kural.</p>"
        "<h2><span>II. Zararın ve kusurun ispatı </span></h2>"
    )
    text = mevzuat.html_to_text(html)
    assert text.startswith("MADDE 49- Kusurlu ve hukuka aykırı")
    assert '"yasaklayan"' in text
    assert "ispatı" not in text
    assert "\n" in text  # paragraflar ayrı satırda


def test_resolve_law_abbreviation():
    assert mevzuat.law_number("TBK") == "6098"
    assert mevzuat.law_number("tmk") == "4721"
    assert mevzuat.law_number("6098") == "6098"
    assert mevzuat.law_number("Türk Borçlar Kanunu") is None


def test_one_hour_cache_writes_cost_double_input_price():
    u = SimpleNamespace(
        input_tokens=0, output_tokens=0, cache_read_input_tokens=0, cache_creation_input_tokens=2_000_000,
        cache_creation=SimpleNamespace(ephemeral_1h_input_tokens=1_000_000, ephemeral_5m_input_tokens=1_000_000),
    )
    # opus: 1M * 4 * 2 (1 saat) + 1M * 4 * 1,25 (5 dk) = 13
    assert llm.cost_usd("claude-opus-5-5", u) == pytest.approx(13.0)


async def test_generate_json_validates_and_records(client, sql):
    from pydantic import BaseModel

    from fakes import FakeStreamClient, message, text_block

    class Out(BaseModel):
        a: int

    fake = FakeStreamClient([message([text_block('{"a": 7}')])])
    llm.set_client(fake)
    try:
        out = await llm.generate_json("hat", Out, model=llm.OPUS, max_tokens=100, messages=[])
    finally:
        llm.set_client(None)
    assert out.a == 7
    fmt = fake.calls[0]["output_config"]["format"]
    assert fmt["type"] == "json_schema" and fmt["schema"]["additionalProperties"] is False
    assert sql.execute("select feature from api_usage").fetchone()[0] == "hat"


async def test_generate_json_records_cost_even_when_truncated(client, sql):
    from pydantic import BaseModel

    from fakes import FakeStreamClient, message, text_block

    class Out(BaseModel):
        a: int

    llm.set_client(FakeStreamClient([message([text_block('{"a": ')], stop_reason="max_tokens")]))
    try:
        with pytest.raises(RuntimeError, match="çıktı sınırı"):
            await llm.generate_json("hat", Out, model=llm.OPUS, max_tokens=100, messages=[])
    finally:
        llm.set_client(None)
    assert sql.execute("select count(*) from api_usage").fetchone()[0] == 1


def test_one_time_pipeline_spend_does_not_count_toward_app_cap(client, sql):
    sql.execute("insert into api_usage (feature, model, cost_usd) values ('pipeline:HUK2011:icerik','claude-opus-5-5', 80)")
    llm.check_budget()  # içerik hattı tavana sayılmaz
    sql.execute("insert into api_usage (feature, model, cost_usd) values ('asistan','claude-sonnet-5-5', 50)")
    with pytest.raises(HTTPException):
        llm.check_budget()


def test_article_paragraph_wrapped_in_heading_tag_is_kept():
    # bedesten TBK m. 8: ikinci fıkra <h2> içinde (font-weight normal), ardından gerçek bölüm başlığı
    html = (
        '<p class="MsoNormal"><b>MADDE 8- </b>Öneren, önerisi ile bağlı olmama hakkının saklı olduğunu açıkça '
        "belirtirse veya işin özelliğinden ya da durumun gereğinden bağlanma niyetinde olmadığı anlaşılırsa, "
        "önerisi kendisini bağlamaz.</p>"
        '<h2 style="margin:0cm"><span style="font-weight:normal">Fiyatını göstererek mal sergilenmesi veya tarife, '
        "fiyat listesi ya da benzerlerinin gönderilmesi, aksi açıkça ve kolaylıkla anlaşılmadıkça öneri sayılır.</span></h2>"
        '<h2 style="margin:0cm"><span>6. İlan yoluyla ödül sözü verme</span></h2>'
    )
    text = mevzuat.html_to_text(html)
    assert "Fiyatını göstererek mal sergilenmesi" in text
    assert "İlan yoluyla ödül" not in text
    assert text.count("\n") == 1


async def test_parse_records_cost_even_when_truncated(client, sql):
    from pydantic import BaseModel

    from fakes import FakeStreamClient, message, text_block

    class Out(BaseModel):
        a: int

    llm.set_client(FakeStreamClient([message([text_block('{"a": ')], stop_reason="max_tokens")]))
    try:
        with pytest.raises(RuntimeError):
            await llm.parse("notlar", Out, model=llm.SONNET, max_tokens=100, messages=[])
    finally:
        llm.set_client(None)
    assert sql.execute("select feature from api_usage").fetchone()[0] == "notlar"


async def test_pipeline_generation_is_not_blocked_by_app_cap(client, sql):
    from pydantic import BaseModel

    from fakes import FakeStreamClient, message, text_block

    class Out(BaseModel):
        a: int

    sql.execute("insert into api_usage (feature, model, cost_usd) values ('asistan','m', 999)")
    llm.set_client(FakeStreamClient([message([text_block('{"a": 1}')])]))
    try:
        out = await llm.generate_json("pipeline:HUK2011:icerik", Out, model=llm.OPUS, max_tokens=100, messages=[])
    finally:
        llm.set_client(None)
    assert out.a == 1


async def test_hub_reconnects_once_when_ictihat_session_died(monkeypatch):
    import anyio

    hub = mcp_hub.McpHub()

    class Dead:
        async def call_tool(self, name, args):
            raise anyio.ClosedResourceError()

    class Alive:
        async def call_tool(self, name, args):
            return SimpleNamespace(content=[SimpleNamespace(type="text", text='{"sonuclar": []}')], isError=False)

    hub._ictihat = Dead()
    restarts = []

    async def fake_restart():
        restarts.append(1)
        hub._ictihat = Alive()

    monkeypatch.setattr(hub, "restart", fake_restart)
    text, is_error = await hub.call("ictihat_ara", {"ifade": "x"})
    assert not is_error and restarts == [1]


def test_trailing_heading_of_next_article_is_dropped():
    html = (
        "<p>Madde 25- Davacı, hâkimden saldırı tehlikesinin önlenmesini isteyebilir.</p>"
        "<p>Davacı, kendi yerleşim yeri mahkemesinde dava açabilir.</p>"
        "<p>III. Ad üzerindeki hak</p>"
    )
    text = mevzuat.html_to_text(html)
    assert text.endswith("dava açabilir.")


def test_leading_own_heading_is_kept():
    text = mevzuat.html_to_text("<p>a. Ölüm</p><p>MADDE 53- Ölüm hâlinde uğranılan zararlar özellikle şunlardır:</p><p>1. Cenaze giderleri.</p>")
    assert text.startswith("a. Ölüm") and text.endswith("1. Cenaze giderleri.")
