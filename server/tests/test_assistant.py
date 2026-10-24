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


def test_cited_text_blocks_are_joined_without_paragraph_breaks(auth_client, kb, tools):
    # web araması atıflı cevabı birçok text bloğuna böler
    fake = FakeClient(create_outputs=[
        message([text_block("Resmî Gazete'de yayımlanan "), text_block("7499 sayılı Kanun ile"), text_block(" değiştirilmiştir.")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    msg = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Ne zaman değişti?", "deep": False}).json()["message"]
    assert msg["content_md"] == "Resmî Gazete'de yayımlanan 7499 sayılı Kanun ile değiştirilmiştir."


def test_long_tool_results_are_truncated(auth_client, kb, monkeypatch):
    async def big(name, args):
        return "x" * 60_000, False

    monkeypatch.setattr(hub, "call", big)
    fake = FakeClient(create_outputs=[
        message([tool_use("t1", "karar_getir", {"karar_id": "1"})], "tool_use"),
        message([text_block("Cevap")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Karar?", "deep": False})
    sent = fake.calls[1][1]["messages"][-1]["content"][0]["content"]
    assert len(sent) < 21_000 and "kısaltıldı" in sent


def test_turn_cap_ends_with_a_tool_free_answer(auth_client, kb, tools, monkeypatch):
    from app.services import assistant_service

    monkeypatch.setattr(assistant_service, "MAX_TURNS", 2)
    fake = FakeClient(create_outputs=[
        message([text_block("Bakıyorum."), tool_use("t1", "madde_getir", {"kanun": "TBK", "madde_no": "36"})], "tool_use"),
        message([text_block("Şimdi de buna bakıyorum."), tool_use("t2", "madde_getir", {"kanun": "TBK", "madde_no": "37"})], "tool_use"),
        message([text_block("Son cevap.")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    msg = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Hile?", "deep": False}).json()["message"]
    assert msg["content_md"] == "Son cevap."
    final = fake.calls[2][1]
    assert final["tool_choice"] == {"type": "none"}
    assert final["messages"][-1]["role"] == "user"  # son araç sonuçları eklendi


def test_partial_kb_matches_and_unopened_cases_are_not_listed_as_sources(auth_client, kb, monkeypatch):
    async def fake_call(name, args):
        if name == "ictihat_ara":
            return json.dumps({"sonuclar": [{"atif": "Yargıtay 1. HD, E.1 K.1", "kaynak": "https://k/1"}]}), False
        if name == "karar_getir":
            return json.dumps({"atif": "Yargıtay 9. CD, E.2 K.2", "kaynak": "https://k/2", "metin": "..."}), False
        return "{}", False

    monkeypatch.setattr(hub, "call", fake_call)
    fake = FakeClient(create_outputs=[
        message([
            tool_use("t1", "bilgi_bankasi_ara", {"sorgu": "aldatma göçmen"}),  # yalnız "aldatma" geçer: kısmi eşleşme
            tool_use("t2", "ictihat_ara", {"ifade": "göçmen kaçakçılığı"}),
        ], "tool_use"),
        message([tool_use("t3", "karar_getir", {"karar_id": "2"})], "tool_use"),
        message([text_block("Cevap")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    msg = auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Soru", "deep": False}).json()["message"]
    assert [s["label"] for s in msg["sources"]] == ["Yargıtay 9. CD, E.2 K.2"]
    # kısmi eşleşme modele yine gider, işaretli olarak
    kb_result = fake.calls[1][1]["messages"][-1]["content"][0]["content"]
    assert "İrade bozuklukları" in kb_result and '"eslesme": "kismi"' in kb_result


def test_only_the_last_block_of_each_turn_is_cache_marked(auth_client, kb, tools):
    fake = FakeClient(create_outputs=[
        message([tool_use("t1", "madde_getir", {"kanun": "TBK", "madde_no": "36"})], "tool_use"),
        message([tool_use("t2", "madde_getir", {"kanun": "TBK", "madde_no": "37"})], "tool_use"),
        message([text_block("Cevap")]),
        message([text_block("Başlık")]),
    ])
    install(fake)
    tid = thread(auth_client)
    auth_client.post(f"/assistant/threads/{tid}/messages", json={"content": "Hile?", "deep": False})

    def marks(call):
        n = 0
        for m in call[1]["messages"]:
            for b in (m["content"] if isinstance(m["content"], list) else []):
                if isinstance(b, dict) and "cache_control" in b:
                    n += 1
        return n

    for call in fake.calls[:3]:
        last = call[1]["messages"][-1]["content"][-1]
        assert last["cache_control"] == {"type": "ephemeral"}
        assert marks(call) == 1  # sistem işaretiyle birlikte en çok 2 kesme noktası
