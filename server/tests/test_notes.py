import io

import pytest
from pypdf import PdfWriter

from app import llm
from app.config import get_settings
from app.services import notes_service as ns
from fakes import FakeClient


def pdf_bytes(pages: int) -> bytes:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


@pytest.fixture
def course(sql):
    sql.execute("insert into courses (id, code, name, year) values ('HUK2011','HUK2011','Borçlar',2)")
    sql.execute("insert into units (id, course_id, title) values ('HUK2011-u01','HUK2011','Ü')")
    sql.execute(
        "insert into topics (id, unit_id, course_id, title, summary_md, critical_md) "
        "values ('HUK2011-irade','HUK2011-u01','HUK2011','İrade bozuklukları','Yanılma, aldatma, korkutma','Süre 1 yıl')"
    )
    return "HUK2011"


def upload(client, data: bytes, name="not.pdf", mime="application/pdf", course_id="HUK2011"):
    return client.post(
        "/notes", files={"file": (name, data, mime)}, data={"course_id": course_id, "title": "Hafta 3 notu"}
    )


def fake_outputs():
    return [
        ns.NoteTopics(matches=[ns.TopicMatch(topic_id="HUK2011-irade", confidence=0.9), ns.TopicMatch(topic_id="YOK", confidence=0.8)]),
        ns.NoteDigest(
            summary_md="Not özeti",
            contradictions=[ns.Contradiction(quote="süre 2 yıldır", problem="TBK m. 39'a göre 1 yıl", suggestion="1 yıl olarak düzelt")],
        ),
        ns.NoteQuiz(
            mcq=[ns.NoteMcq(stem_md="Soru", options=["a", "b", "c", "d"], correct_option=2, explanation_md="e")],
            cards=[ns.NoteCard(front_md="Ön", back_md="Arka")],
        ),
    ]


@pytest.fixture
def fake(monkeypatch):
    client = FakeClient(parse_outputs=fake_outputs())
    llm.set_client(client)
    monkeypatch.setattr(ns, "extract_pdf_text", lambda path: "Yanılma ve aldatma. Süre 2 yıldır. " * 20)
    yield client
    llm.set_client(None)


def test_file_over_size_limit_is_413(auth_client, course, monkeypatch, sql):
    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    r = upload(auth_client, b"%PDF-" + b"0" * (1024 * 1024 + 10))
    assert r.status_code == 413
    assert sql.execute("select count(*) from notes").fetchone()[0] == 0


def test_pdf_over_page_limit_is_413(auth_client, course, monkeypatch, sql):
    monkeypatch.setattr(get_settings(), "max_pdf_pages", 2)
    r = upload(auth_client, pdf_bytes(3))
    assert r.status_code == 413
    assert sql.execute("select count(*) from notes").fetchone()[0] == 0


def test_unsupported_type_is_415(auth_client, course):
    assert upload(auth_client, b"merhaba", name="a.txt", mime="text/plain").status_code == 415


def test_unknown_course_is_404(auth_client, course):
    assert upload(auth_client, pdf_bytes(1), course_id="YOK").status_code == 404


def test_full_flow_produces_summary_questions_and_cards(auth_client, course, fake, sql):
    r = upload(auth_client, pdf_bytes(1))
    assert r.status_code == 200, r.text
    note_id = r.json()["id"]
    detail = auth_client.get(f"/notes/{note_id}").json()
    assert detail["status"] == "ready", detail
    assert detail["summary_md"] == "Not özeti"
    assert detail["contradictions"][0]["suggestion"] == "1 yıl olarak düzelt"
    assert detail["topics"] == [{"topic_id": "HUK2011-irade", "title": "İrade bozuklukları", "confidence": pytest.approx(0.9)}]
    q = detail["questions"][0]
    assert q["id"] == f"note-{note_id}-q01" and q["origin"] == "note" and q["topic_id"] == "HUK2011-irade"
    assert q["options"][q["correct_option"]] == "c"
    assert detail["flashcards"][0]["id"] == f"note-{note_id}-k01"
    # nottan gelenler export'ta görünür, sürüm artar
    export = auth_client.get("/kb/export").json()
    assert any(x["origin"] == "note" for x in export["questions"])
    assert int(export["version"]) >= 1
    models = [kw["model"] for _, kw in fake.calls]
    assert models == [llm.HAIKU, llm.SONNET, llm.HAIKU]


def test_failure_marks_note_failed(auth_client, course, monkeypatch):
    client = FakeClient(parse_outputs=[])  # ilk çağrıda IndexError
    llm.set_client(client)
    monkeypatch.setattr(ns, "extract_pdf_text", lambda path: "metin " * 100)
    try:
        note_id = upload(auth_client, pdf_bytes(1)).json()["id"]
    finally:
        llm.set_client(None)
    detail = auth_client.get(f"/notes/{note_id}").json()
    assert detail["status"] == "failed"
    assert detail["error"]


def test_list_and_delete(auth_client, course, fake, sql):
    note_id = upload(auth_client, pdf_bytes(1)).json()["id"]
    items = auth_client.get("/notes").json()
    assert [n["id"] for n in items] == [note_id]
    assert auth_client.delete(f"/notes/{note_id}").status_code == 200
    assert auth_client.get("/notes").json() == []
    assert sql.execute("select count(*) from questions where origin='note'").fetchone()[0] == 0
