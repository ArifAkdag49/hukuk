from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import db
from ..auth import require_user

router = APIRouter(dependencies=[Depends(require_user)])

TOPIC_COLS = (
    "id, unit_id, course_id, title, sort_order, summary_md, content_md, critical_md, "
    "doctrine_md, glossary, verification_status, verification_notes, generated_at"
)


@router.get("/kb/version")
def version():
    row = db.fetch_one("select value from kb_meta where key = 'kb_version'")
    return {"version": row["value"] if row else "0"}


def _export() -> dict:
    articles = defaultdict(list)
    for a in db.fetch_all(
        "select topic_id, law_name, law_no, article_no, official_text, source_url, verified "
        "from topic_articles order by topic_id, sort_order, id"
    ):
        articles[a.pop("topic_id")].append(a)
    cases = defaultdict(list)
    for c in db.fetch_all(
        "select topic_id, court, chamber, esas_no, karar_no, decision_date, summary_md, source_url, verified "
        "from topic_cases order by topic_id, sort_order, id"
    ):
        cases[c.pop("topic_id")].append(c)

    topics = db.fetch_all(f"select {TOPIC_COLS} from topics order by course_id, sort_order")
    for t in topics:
        t["articles"] = articles.get(t["id"], [])
        t["cases"] = cases.get(t["id"], [])

    return {
        "version": version()["version"],
        "courses": db.fetch_all("select id, code, name, year, sort_order, is_active from courses order by year, sort_order, id"),
        "units": db.fetch_all("select id, course_id, title, sort_order from units order by course_id, sort_order"),
        "topics": topics,
        "questions": db.fetch_all(
            "select id, topic_id, course_id, kind, stem_md, options, correct_option, explanation_md, "
            "rubric, model_answer_md, origin, note_id from questions order by course_id, topic_id, sort_order, id"
        ),
        "flashcards": db.fetch_all(
            "select id, topic_id, course_id, front_md, back_md, origin, note_id "
            "from flashcards order by course_id, topic_id, sort_order, id"
        ),
        "tables": db.fetch_all(
            "select id, course_id, title, columns, rows, related_topic_ids "
            "from comparison_tables order by course_id, sort_order"
        ),
    }


@router.get("/kb/export")
def export():
    return _export()


class CourseIn(BaseModel):
    code: str
    name: str
    year: int


class CoursePatch(BaseModel):
    name: str | None = None
    is_active: bool | None = None


COURSE_COLS = "id, code, name, year, sort_order, is_active"


@router.post("/kb/courses")
def create_course(body: CourseIn):
    row = db.fetch_one(
        f"insert into courses (id, code, name, year, sort_order) "
        f"values (%(code)s, %(code)s, %(name)s, %(year)s, 999) "
        f"on conflict (id) do update set name = excluded.name, year = excluded.year "
        f"returning {COURSE_COLS}",
        body.model_dump(),
    )
    db.bump_kb_version()
    return row


@router.patch("/kb/courses/{course_id}")
def update_course(course_id: str, body: CoursePatch):
    row = db.fetch_one(
        f"update courses set name = coalesce(%s, name), is_active = coalesce(%s, is_active) "
        f"where id = %s returning {COURSE_COLS}",
        [body.name, body.is_active, course_id],
    )
    if row is None:
        raise HTTPException(404, "Ders bulunamadı")
    db.bump_kb_version()
    return row
