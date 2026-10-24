import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from .. import db, llm
from ..auth import require_user
from ..config import get_settings
from ..services import notes_service as ns

router = APIRouter(dependencies=[Depends(require_user)])

EXT = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
       ns.DOCX: ".docx", ns.XLSX: ".xlsx"}


@router.post("/notes")
async def upload(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: str = Form(...),
    title: str = Form(...),
    filename: str | None = Form(None),
):
    s = get_settings()
    # Telefondaki yükleyici dosya adını ayrıca gönderir; tür bilinmiyorsa uzantıdan bulunur
    mime = ns.guess_mime(file.content_type, filename or file.filename)
    if mime not in ns.SUPPORTED:
        raise HTTPException(415, "Desteklenen türler: PDF, Word (.docx), Excel (.xlsx), JPEG, PNG, WEBP")
    data = await file.read()
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Dosya çok büyük (en fazla {s.max_upload_mb} MB)")
    if await db.run(db.fetch_one, "select 1 from courses where id = %s", [course_id]) is None:
        raise HTTPException(404, "Ders bulunamadı")
    await llm.ensure_budget()

    note_id = str(uuid.uuid4())
    path = os.path.join(s.upload_dir, note_id + EXT[mime])
    with open(path, "wb") as f:
        f.write(data)
    if mime in ns.IMAGE_TYPES:
        try:
            path, mime = await db.run(ns.prepare_image, path, mime)
        except Exception:
            ns.delete_files(path)
            raise HTTPException(422, "Görsel okunamadı")
    if mime == ns.PDF:
        try:
            pages = await db.run(ns.pdf_page_count, path)
        except Exception:
            ns.delete_files(path)
            raise HTTPException(422, "PDF okunamadı")
        if pages > s.max_pdf_pages:
            ns.delete_files(path)
            raise HTTPException(413, f"PDF çok uzun (en fazla {s.max_pdf_pages} sayfa)")

    await db.run(
        db.execute,
        "insert into notes (id, course_id, title, file_path, mime, status) values (%s, %s, %s, %s, %s, 'processing')",
        [note_id, course_id, title.strip() or "Not", path, mime],
    )
    background.add_task(ns.process, note_id)
    return {"id": note_id, "status": "processing"}


@router.get("/notes")
def list_notes():
    return db.fetch_all("select id, course_id, title, status, error, created_at from notes order by created_at desc")


@router.get("/notes/{note_id}")
def get_note(note_id: uuid.UUID):
    note = db.fetch_one(
        "select id, course_id, title, status, error, summary_md, contradictions, created_at from notes where id = %s",
        [note_id],
    )
    if note is None:
        raise HTTPException(404, "Not bulunamadı")
    note["topics"] = db.fetch_all(
        "select nt.topic_id, t.title, nt.confidence from note_topics nt join topics t on t.id = nt.topic_id "
        "where nt.note_id = %s order by nt.confidence desc",
        [note_id],
    )
    note["questions"] = db.fetch_all(
        "select id, topic_id, course_id, kind, stem_md, options, correct_option, explanation_md, rubric, "
        "model_answer_md, origin, note_id from questions where note_id = %s order by sort_order",
        [note_id],
    )
    note["flashcards"] = db.fetch_all(
        "select id, topic_id, course_id, front_md, back_md, origin, note_id from flashcards where note_id = %s order by sort_order",
        [note_id],
    )
    return note


@router.delete("/notes/{note_id}")
def delete_note(note_id: uuid.UUID):
    row = db.fetch_one("delete from notes where id = %s returning file_path", [note_id])
    if row is None:
        raise HTTPException(404, "Not bulunamadı")
    ns.delete_files(row["file_path"])
    db.bump_kb_version()
    return {"ok": True}
