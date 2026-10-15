import json

import pytest

from app import llm
from app.mcp_hub import hub
from fakes import FakeClient, message, text_block, tool_use


@pytest.fixture
def kb(sql):
    sql.execute("insert into courses (id, code, name, year) values ('HUK2011','HUK2011','Borçlar',2)")
    sql.execute("insert into units (id, course_id, title) values ('HUK2011-u01','HUK2011','Ü')")
    sql.execute(
        "insert into topics (id, unit_id, course_id, title, summary_md, content_md) values "
        "('HUK2011-irade','HUK2011-u01','HUK2011','İrade bozuklukları','Yanılma, aldatma ve korkutma sözleşmeyi iptal edilebilir kılar.','Aşırı yararlanma da ayrıca düzenlenmiştir.')"
    )


@pytest.fixture
def tools(monkeypatch):
    calls = []

    async def fake_call(name, args):
        calls.append((name, args))
        if name == "madde_getir":
            return json.dumps({"kanun": "TÜRK BORÇLAR KANUNU", "madde_no": "36", "metin": "MADDE 36- ...", "kaynak": "https://mevzuat"}), False
        if name == "ictihat_ara":
            return "Resmî kaynağa şu anda ulaşılamıyor (captcha)", True
        return "{}", False

    monkeypatch.setattr(hub, "call", fake_call)
    return calls


def thread(client, topic_id=None):
    r = client.post("/assistant/threads", json={"topic_id": topic_id})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def install(client):
    llm.set_client(client)


@pytest.fixture(autouse=True)
def _reset():
    yield
    llm.set_client(None)


def test_tool_loop_collects_sources_and_saves_messages(auth_client, kb, tools, sql):
    fake = FakeClient(create_outputs=[
        message([tool_use("t1", "bilgi_bankasi_ara", {"sorgu": "yanılma"}), tool_use("t2", "madde_getir", {"kanun": "TBK", "madde_no": "36"})], "tool_use"),
        message([text_block("Hile TBK m. 36'da düzenlenir.")]),
    ], parse_outputs=[])
    fake.title_text = None
    install(fake)
    # başlık için Haiku: create üçüncü çıktı
    fake.create_outputs.append(message([text_block("Hile ve iptal")]))
    tid = thread(auth_client)
    r = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Hile nedir?", "deep": False})
    assert r.status_code == 200, r.text
    msg = r.json()["message"]
    assert msg["content_md"] == "Hile TBK m. 36'da düzenlenir."
    types = {s["type"] for s in msg["sources"]}
    assert {"kb", "madde"} <= types
    assert msg["model"] == llm.SONNET
    # araç sonuçları ikinci çağrıda modele gitti
    second = fake.calls[1][1]["messages"][-1]["content"]
    assert {c["tool_use_id"] for c in second} == {"t1", "t2"}
    assert "İrade bozuklukları" in second[0]["content"]
    history = auth_client.get(f"/assistant/threads/{tid}/messages").json()
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert auth_client.get("/assistant/threads").json()[0]["title"] == "Hile ve iptal"


def test_tool_failure_is_passed_as_error_and_no_case_source(auth_client, kb, tools):
    fake = FakeClient(create_outputs=[
        message([tool_use("t1", "ictihat_ara", {"ifade": "hile"})], "tool_use"),
        message([text_block("Resmî kaynağa ulaşılamıyor; karar veremiyorum.")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    msg = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Hile kararı?", "deep": False}).json()["message"]
    result = fake.calls[1][1]["messages"][-1]["content"][0]
    assert result["is_error"] is True
    assert all(s["type"] != "karar" for s in msg["sources"])


def test_deep_uses_opus(auth_client, kb, tools):
    fake = FakeClient(create_outputs=[message([text_block("Derin cevap")]), message([text_block("Başlık")])])
    install(fake)
    tid = thread(auth_client)
    msg = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Soru", "deep": True}).json()["message"]
    assert fake.calls[0][1]["model"] == llm.OPUS
    assert msg["model"] == llm.OPUS


def test_topic_context_is_added_to_system(auth_client, kb, tools):
    fake = FakeClient(create_outputs=[message([text_block("Cevap")]), message([text_block("Başlık")])])
    install(fake)
    tid = thread(auth_client, topic_id="HUK2011-irade")
    auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Bunu açıkla", "deep": False})
    system = fake.calls[0][1]["system"]
    assert any("İrade bozuklukları" in b["text"] for b in system)


def test_long_thread_suggests_new_one(auth_client, kb, tools, sql):
    tid = thread(auth_client)
    for i in range(20):
        sql.execute(
            "insert into chat_messages (id, thread_id, role, content_md) values (gen_random_uuid(), %s, %s, 'x')",
            [tid, "user" if i % 2 == 0 else "assistant"],
        )
    fake = FakeClient(create_outputs=[message([text_block("Cevap")])])
    install(fake)
    body = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Soru", "deep": False}).json()
    assert body["suggest_new_thread"] is True


def test_unknown_thread_is_404(auth_client):
    r = auth_client.post("/assistant/threads/00000000-0000-0000-0000-000000000009/messages", json={"content": "x", "deep": False})
    assert r.status_code == 404


def test_search_kb_finds_turkish_stems(client, kb):
    from app import search

    hits = search.search_kb("aldatmalar")
    assert hits and hits[0]["id"] == "HUK2011-irade"
