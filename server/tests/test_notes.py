import io
import os

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


def test_large_phone_photo_is_downscaled_under_api_limits(tmp_path):
    from PIL import Image

    src = tmp_path / "foto.png"
    Image.new("RGB", (8200, 3000), (200, 120, 40)).save(src)
    path, mime = ns.prepare_image(str(src), "image/png")
    with Image.open(path) as im:
        assert max(im.size) <= ns.MAX_IMAGE_SIDE
    assert os.path.getsize(path) < 5 * 1024 * 1024
    assert mime == "image/jpeg"


def test_small_image_is_left_alone(tmp_path):
    from PIL import Image

    src = tmp_path / "kucuk.png"
    Image.new("RGB", (800, 600), (0, 0, 0)).save(src)
    assert ns.prepare_image(str(src), "image/png") == (str(src), "image/png")


def test_notes_left_processing_by_a_restart_are_marked_failed(course, sql):
    from fastapi.testclient import TestClient

    from app.main import create_app

    sql.execute(
        "insert into notes (id, course_id, title, file_path, mime, status, created_at) values "
        "('00000000-0000-0000-0000-0000000000aa','HUK2011','eski','f','application/pdf','processing', now() - interval '1 hour')"
    )
    with TestClient(create_app()):
        pass
    row = sql.execute("select status, error from notes").fetchone()
    assert row[0] == "failed" and "yarıda" in row[1]


def docx_bytes() -> bytes:
    from docx import Document

    d = Document()
    d.add_heading("İrade bozuklukları", 1)
    d.add_paragraph("Yanılmada süre bir yıldır.")
    t = d.add_table(rows=2, cols=2)
    t.cell(0, 0).text, t.cell(0, 1).text = "Hâl", "Madde"
    t.cell(1, 0).text, t.cell(1, 1).text = "Aldatma", "TBK m. 36"
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def xlsx_bytes() -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "Süreler"
    ws.append(["Hâl", "Süre"])
    ws.append(["Yanılma", "1 yıl"])
    ws.append([None, None])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_word_and_excel_text_is_extracted_in_order(tmp_path):
    p = tmp_path / "n.docx"
    p.write_bytes(docx_bytes())
    assert ns.extract_office_text(str(p), ns.DOCX) == "İrade bozuklukları\nYanılmada süre bir yıldır.\nHâl | Madde\nAldatma | TBK m. 36"
    x = tmp_path / "n.xlsx"
    x.write_bytes(xlsx_bytes())
    assert ns.extract_office_text(str(x), ns.XLSX) == "## Süreler\nHâl | Süre\nYanılma | 1 yıl"


def test_type_is_taken_from_extension_when_phone_sends_octet_stream():
    assert ns.guess_mime("application/octet-stream", "hafta3.DOCX") == ns.DOCX
    assert ns.guess_mime("application/pdf", "x.bin") == ns.PDF
    assert ns.guess_mime(None, "a.txt") == ""


def test_word_note_is_processed_without_transcription(auth_client, course, sql, monkeypatch):
    client = FakeClient(parse_outputs=fake_outputs())
    llm.set_client(client)
    monkeypatch.setattr(ns, "extract_office_text", lambda path, mime: "Yanılma ve aldatma. Süre 2 yıldır. " * 20)
    try:
        r = auth_client.post(
            "/notes",
            files={"file": ("hafta3.docx", docx_bytes(), "application/octet-stream")},
            data={"course_id": "HUK2011", "title": "Hafta 3", "filename": "hafta3.docx"},
        )
        assert r.status_code == 200, r.text
        detail = auth_client.get(f"/notes/{r.json()['id']}").json()
        assert detail["status"] == "ready", detail
        # metin doğrudan çıkarıldı: görsel aktarma (Sonnet transcribe) çağrılmadı
        assert [kw["model"] for _, kw in client.calls] == [llm.HAIKU, llm.SONNET, llm.HAIKU]
    finally:
        llm.set_client(None)


def image_pdf(path, pages: int, side: int = 2600) -> None:
    """Telefonla taranmış gibi: her sayfa büyük, sıkışmayan bir görsel."""
    from PIL import Image

    imgs = [Image.frombytes("RGB", (side, side), os.urandom(side * side * 3)) for _ in range(pages)]
    imgs[0].save(path, "PDF", save_all=True, append_images=imgs[1:], quality=95)


def test_small_pdf_is_sent_as_is(tmp_path):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 1, side=300)
    assert ns.split_pdf_for_api(p) == [p]


def test_oversized_scanned_pdf_is_shrunk_and_split_under_limit(tmp_path):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 4)
    original = os.path.getsize(p)
    # küçültülmüş bir sayfa sığar, dört sayfa birlikte sığmaz → birden çok parça
    one_page = ns._write_pdf(ns.PdfReader(p), 0, 1, str(tmp_path / "tek.pdf"), shrink=True)
    limit = int(one_page * 2.5)
    assert original > limit
    parts = ns.split_pdf_for_api(p, limit=limit)
    assert len(parts) > 1
    assert all(os.path.getsize(x) <= limit for x in parts)
    assert sum(len(ns.PdfReader(x).pages) for x in parts) == 4
    ns.delete_parts(p, parts)
    assert os.path.exists(p) and not any(os.path.exists(x) for x in parts)


def test_single_page_too_big_gives_clear_error_and_leaves_no_parts(tmp_path):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 2)
    with pytest.raises(RuntimeError, match="tek başına çok büyük"):
        ns.split_pdf_for_api(p, limit=1000)
    assert sorted(os.listdir(tmp_path)) == ["n.pdf"]


async def test_large_scanned_pdf_is_transcribed_part_by_part(tmp_path, monkeypatch):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 3)
    parts = [str(tmp_path / f"p{i}.pdf") for i in range(3)]
    for x in parts:
        image_pdf(x, 1, side=50)
    monkeypatch.setattr(ns, "split_pdf_for_api", lambda path: parts)
    seen = []

    async def one(path, mime):
        seen.append(path)
        return f"metin {len(seen)}"

    monkeypatch.setattr(ns, "_transcribe_one", one)
    assert await ns.transcribe(p, ns.PDF) == "metin 1\n\nmetin 2\n\nmetin 3"
    assert seen == parts
    assert not any(os.path.exists(x) for x in parts) and os.path.exists(p)


def test_big_pdf_is_compressed_once_on_upload(tmp_path, monkeypatch):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 2)
    before = os.path.getsize(p)
    monkeypatch.setattr(ns, "COMPRESS_ON_UPLOAD_BYTES", 1000)
    after = ns.compress_pdf(p)
    assert after < before and os.path.getsize(p) == after
    assert len(ns.PdfReader(p).pages) == 2
    assert sorted(os.listdir(tmp_path)) == ["n.pdf"]


def test_small_or_broken_pdf_is_left_untouched(tmp_path, monkeypatch):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 1, side=200)
    data = open(p, "rb").read()
    assert ns.compress_pdf(p) == len(data) and open(p, "rb").read() == data
    monkeypatch.setattr(ns, "COMPRESS_ON_UPLOAD_BYTES", 10)
    bad = str(tmp_path / "bozuk.pdf")
    open(bad, "wb").write(b"%PDF-1.4 bozuk")
    assert ns.compress_pdf(bad) == 14
    assert sorted(os.listdir(tmp_path)) == ["bozuk.pdf", "n.pdf"]


def test_upload_stores_compressed_pdf(auth_client, course, fake, sql, tmp_path, monkeypatch):
    p = str(tmp_path / "n.pdf")
    image_pdf(p, 2)
    data = open(p, "rb").read()
    monkeypatch.setattr(ns, "COMPRESS_ON_UPLOAD_BYTES", 1000)
    r = upload(auth_client, data)
    assert r.status_code == 200, r.text
    stored = sql.execute("select file_path from notes where id = %s", [r.json()["id"]]).fetchone()[0]
    assert os.path.getsize(stored) < len(data)
