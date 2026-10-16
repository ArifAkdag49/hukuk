from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import db
from ..auth import require_user

router = APIRouter(dependencies=[Depends(require_user)])


class Attempt(BaseModel):
    id: UUID
    question_id: str
    kind: Literal["mcq", "case"]
    selected_option: int | None = None
    answer_text: str | None = None
    correct: bool | None = None
    score: int | None = None
    feedback: Any = None
    created_at: datetime


class CardReview(BaseModel):
    id: UUID
    card_id: str
    grade: Literal["again", "hard", "good", "easy"]
    reviewed_at: datetime


class CardState(BaseModel):
    card_id: str
    ease: float
    interval_days: int
    repetitions: int
    due_at: datetime
    last_grade: str | None = None
    updated_at: datetime


class TopicNote(BaseModel):
    topic_id: str
    body_md: str
    updated_at: datetime


class Highlight(BaseModel):
    id: UUID
    topic_id: str
    section: Literal["summary", "content", "critical", "doctrine"]
    block_hash: str
    excerpt: str
    deleted: bool = False
    updated_at: datetime


class SyncIn(BaseModel):
    attempts: list[Attempt] = []
    card_reviews: list[CardReview] = []
    card_states: list[CardState] = []
    topic_notes: list[TopicNote] = []
    highlights: list[Highlight] = []


@router.post("/progress/sync")
def sync(body: SyncIn):
    with db.pool().connection() as conn, conn.transaction():
        for a in body.attempts:
            d = a.model_dump()
            d["feedback"] = db.json(d["feedback"]) if d["feedback"] is not None else None
            conn.execute(
                "insert into attempts (id, question_id, kind, selected_option, answer_text, correct, score, feedback, created_at) "
                "values (%(id)s, %(question_id)s, %(kind)s, %(selected_option)s, %(answer_text)s, %(correct)s, "
                "%(score)s, %(feedback)s, %(created_at)s) on conflict (id) do nothing",
                d,
            )
        for r in body.card_reviews:
            conn.execute(
                "insert into card_reviews (id, card_id, grade, reviewed_at) "
                "values (%(id)s, %(card_id)s, %(grade)s, %(reviewed_at)s) on conflict (id) do nothing",
                r.model_dump(),
            )
        for s in body.card_states:
            # yalnızca daha yeni durum eskisini ezer (iki cihaz/çevrimdışı sıra)
            conn.execute(
                "insert into card_states (card_id, ease, interval_days, repetitions, due_at, last_grade, updated_at) "
                "values (%(card_id)s, %(ease)s, %(interval_days)s, %(repetitions)s, %(due_at)s, %(last_grade)s, %(updated_at)s) "
                "on conflict (card_id) do update set ease = excluded.ease, interval_days = excluded.interval_days, "
                "repetitions = excluded.repetitions, due_at = excluded.due_at, last_grade = excluded.last_grade, "
                "updated_at = excluded.updated_at where card_states.updated_at < excluded.updated_at",
                s.model_dump(),
            )
        # notlar ve vurgular: son yazan kazanır
        for n in body.topic_notes:
            conn.execute(
                "insert into topic_notes (topic_id, body_md, updated_at) values (%(topic_id)s, %(body_md)s, %(updated_at)s) "
                "on conflict (topic_id) do update set body_md = excluded.body_md, updated_at = excluded.updated_at "
                "where topic_notes.updated_at < excluded.updated_at",
                n.model_dump(),
            )
        for h in body.highlights:
            conn.execute(
                "insert into highlights (id, topic_id, section, block_hash, excerpt, deleted, updated_at) "
                "values (%(id)s, %(topic_id)s, %(section)s, %(block_hash)s, %(excerpt)s, %(deleted)s, %(updated_at)s) "
                "on conflict (id) do update set deleted = excluded.deleted, excerpt = excluded.excerpt, "
                "updated_at = excluded.updated_at where highlights.updated_at < excluded.updated_at",
                h.model_dump(),
            )
    return {"ok": True, "server_time": datetime.now(timezone.utc).isoformat()}


@router.get("/progress/all")
def all_progress():
    return {
        "attempts": db.fetch_all(
            "select id, question_id, kind, selected_option, answer_text, correct, score, feedback, created_at "
            "from attempts order by created_at"
        ),
        "card_reviews": db.fetch_all("select id, card_id, grade, reviewed_at from card_reviews order by reviewed_at"),
        "card_states": db.fetch_all(
            "select card_id, ease, interval_days, repetitions, due_at, last_grade, updated_at from card_states"
        ),
        "topic_notes": db.fetch_all("select topic_id, body_md, updated_at from topic_notes"),
        "highlights": db.fetch_all(
            "select id, topic_id, section, block_hash, excerpt, deleted, updated_at from highlights where not deleted"
        ),
    }
