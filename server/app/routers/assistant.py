import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from .. import db
from ..auth import require_user
from ..services import assistant_service

router = APIRouter(dependencies=[Depends(require_user)])


class ThreadIn(BaseModel):
    topic_id: str | None = None
    note_id: uuid.UUID | None = None


class MessageIn(BaseModel):
    content: str
    deep: bool = False

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Mesaj boş olamaz")
        return v.strip()


THREAD_COLS = "id, title, topic_id, note_id, created_at"


@router.post("/assistant/threads")
def create_thread(body: ThreadIn):
    if body.topic_id and db.fetch_one("select 1 from topics where id = %s", [body.topic_id]) is None:
        raise HTTPException(404, "Konu bulunamadı")
    note = None
    if body.note_id:
        note = db.fetch_one("select title, status from notes where id = %s", [body.note_id])
        if note is None:
            raise HTTPException(404, "Not bulunamadı")
        if note["status"] != "ready":
            raise HTTPException(409, "Not henüz hazır değil")
    t = db.fetch_one(
        f"insert into chat_threads (id, topic_id, note_id) values (%s, %s, %s) returning {THREAD_COLS}",
        [str(uuid.uuid4()), body.topic_id, body.note_id],
    )
    return {**t, "note_title": note["title"] if note else None}


@router.get("/assistant/threads")
def list_threads():
    return db.fetch_all(
        "select t.id, t.title, t.topic_id, t.note_id, n.title as note_title, t.created_at from chat_threads t "
        "left join notes n on n.id = t.note_id "
        "left join lateral (select max(created_at) as last from chat_messages m where m.thread_id = t.id) l on true "
        "order by coalesce(l.last, t.created_at) desc"
    )


@router.get("/assistant/threads/{thread_id}/messages")
def list_messages(thread_id: uuid.UUID):
    return db.fetch_all(
        "select id, thread_id, role, content_md, sources, model, created_at from chat_messages "
        "where thread_id = %s order by created_at",
        [thread_id],
    )


@router.post("/assistant/threads/{thread_id}/messages")
async def send(thread_id: uuid.UUID, body: MessageIn):
    thread = await db.run(db.fetch_one, f"select {THREAD_COLS} from chat_threads where id = %s", [thread_id])
    if thread is None:
        raise HTTPException(404, "Sohbet bulunamadı")
    return await assistant_service.answer(thread, body.content, body.deep)


@router.delete("/assistant/threads/{thread_id}")
def delete_thread(thread_id: uuid.UUID):
    db.execute("delete from chat_threads where id = %s", [thread_id])
    return {"ok": True}
