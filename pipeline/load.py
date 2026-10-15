"""Üretim çıktısını veritabanına yazar.

Kimlikler sıra numarasından türetilir (konu-q01, konu-o01, konu-k01); aynı ders
yeniden yüklendiğinde öğrencinin ilerlemesinin bağlı olduğu kimlikler değişmez.
Nottan üretilen sorulara/kartlara dokunulmaz.
"""

from app import db


def unit_id(course_id: str, idx: int) -> str:
    return f"{course_id}-u{idx:02d}"


def topic_id(course_id: str, slug: str) -> str:
    return f"{course_id}-{slug}"


def load_course(course: dict, topics: list[dict], tables: list[dict]) -> None:
    with db.pool().connection() as conn, conn.transaction():
        conn.execute(
            "insert into courses (id, code, name, year, sort_order) values (%(id)s, %(code)s, %(name)s, %(year)s, %(sort_order)s) "
            "on conflict (id) do update set code = excluded.code, name = excluded.name, year = excluded.year, "
            "sort_order = excluded.sort_order",
            course,
        )
        cid = course["id"]
        slug_to_id = {}
        for t in topics:
            uid = unit_id(cid, t["unit_index"])
            conn.execute(
                "insert into units (id, course_id, title, sort_order) values (%s, %s, %s, %s) "
                "on conflict (id) do update set title = excluded.title, sort_order = excluded.sort_order",
                [uid, cid, t["unit_title"], t["unit_index"]],
            )
            tid = topic_id(cid, t["slug"])
            slug_to_id[t["slug"]] = tid
            c = t["content"]
            v = t.get("verification") or {"status": "partial", "issues": []}
            conn.execute(
                "insert into topics (id, unit_id, course_id, title, sort_order, summary_md, content_md, critical_md, "
                "doctrine_md, glossary, generated_at, model, skill_refs, verification_status, verification_notes) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on conflict (id) do update set "
                "unit_id = excluded.unit_id, title = excluded.title, sort_order = excluded.sort_order, "
                "summary_md = excluded.summary_md, content_md = excluded.content_md, critical_md = excluded.critical_md, "
                "doctrine_md = excluded.doctrine_md, glossary = excluded.glossary, generated_at = excluded.generated_at, "
                "model = excluded.model, skill_refs = excluded.skill_refs, "
                "verification_status = excluded.verification_status, verification_notes = excluded.verification_notes",
                [
                    tid, uid, cid, t["title"], t["unit_index"] * 100 + t["topic_index"],
                    c["summary_md"], c["content_md"], c["critical_md"], c["doctrine_md"], db.json(c["glossary"]),
                    t.get("generated_at"), t.get("model"), t.get("skill_refs", []),
                    v["status"], db.json(v["issues"]),
                ],
            )

            conn.execute("delete from topic_articles where topic_id = %s", [tid])
            for i, a in enumerate(t["articles"], 1):
                conn.execute(
                    "insert into topic_articles (topic_id, sort_order, law_name, law_no, article_no, official_text, "
                    "source_url, fetched_at, verified) values (%s,%s,%s,%s,%s,%s,%s,now(),%s)",
                    [tid, i, a["law_name"], a.get("law_no"), a["article_no"], a.get("official_text"), a.get("source_url"), a.get("verified", False)],
                )
            conn.execute("delete from topic_cases where topic_id = %s", [tid])
            for i, k in enumerate(t["cases"], 1):
                conn.execute(
                    "insert into topic_cases (topic_id, sort_order, court, chamber, esas_no, karar_no, decision_date, "
                    "summary_md, source_url, verified) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    [tid, i, k["court"], k.get("chamber"), k.get("esas_no"), k.get("karar_no"), k.get("decision_date"),
                     k["summary_md"], k.get("source_url"), k.get("verified", False)],
                )

            keep_q: list[str] = []
            for i, q in enumerate(t["mcq"], 1):
                qid = f"{tid}-q{i:02d}"
                keep_q.append(qid)
                conn.execute(
                    "insert into questions (id, topic_id, course_id, sort_order, kind, stem_md, options, correct_option, "
                    "explanation_md, origin) values (%s,%s,%s,%s,'mcq',%s,%s,%s,%s,'bank') on conflict (id) do update set "
                    "stem_md = excluded.stem_md, options = excluded.options, correct_option = excluded.correct_option, "
                    "explanation_md = excluded.explanation_md, sort_order = excluded.sort_order",
                    [qid, tid, cid, i, q["stem_md"], db.json(q["options"]), q["correct_option"], q["explanation_md"]],
                )
            for i, q in enumerate(t["cases_q"], 1):
                qid = f"{tid}-o{i:02d}"
                keep_q.append(qid)
                conn.execute(
                    "insert into questions (id, topic_id, course_id, sort_order, kind, stem_md, rubric, model_answer_md, origin) "
                    "values (%s,%s,%s,%s,'case',%s,%s,%s,'bank') on conflict (id) do update set "
                    "stem_md = excluded.stem_md, rubric = excluded.rubric, model_answer_md = excluded.model_answer_md, "
                    "sort_order = excluded.sort_order",
                    [qid, tid, cid, 100 + i, q["stem_md"], db.json(q["rubric"]), q["model_answer_md"]],
                )
            conn.execute(
                "delete from questions where topic_id = %s and origin = 'bank' and not (id = any(%s))", [tid, keep_q]
            )

            keep_k: list[str] = []
            for i, k in enumerate(t["cards"], 1):
                kid = f"{tid}-k{i:02d}"
                keep_k.append(kid)
                conn.execute(
                    "insert into flashcards (id, topic_id, course_id, sort_order, front_md, back_md, origin) "
                    "values (%s,%s,%s,%s,%s,%s,'bank') on conflict (id) do update set "
                    "front_md = excluded.front_md, back_md = excluded.back_md, sort_order = excluded.sort_order",
                    [kid, tid, cid, i, k["front_md"], k["back_md"]],
                )
            conn.execute(
                "delete from flashcards where topic_id = %s and origin = 'bank' and not (id = any(%s))", [tid, keep_k]
            )

        if tables is not None:
            conn.execute("delete from comparison_tables where course_id = %s", [cid])
            for i, tb in enumerate(tables, 1):
                related = [slug_to_id[s] for s in tb.get("related_slugs", []) if s in slug_to_id]
                conn.execute(
                    "insert into comparison_tables (id, course_id, sort_order, title, columns, rows, related_topic_ids) "
                    "values (%s,%s,%s,%s,%s,%s,%s)",
                    [f"{cid}-t{i:02d}", cid, i, tb["title"], db.json(tb["columns"]), db.json(tb["rows"]), related],
                )

        conn.execute("update kb_meta set value = (value::bigint + 1)::text where key = 'kb_version'")


def ensure_courses(courses: list[dict]) -> None:
    """Kapsamdaki tüm dersleri (içeriği henüz olmayanlar dahil) kaydeder."""
    with db.pool().connection() as conn, conn.transaction():
        for c in courses:
            conn.execute(
                "insert into courses (id, code, name, year, sort_order) values (%(id)s, %(code)s, %(name)s, %(year)s, %(sort_order)s) "
                "on conflict (id) do update set code = excluded.code, name = excluded.name, year = excluded.year, "
                "sort_order = excluded.sort_order",
                c,
            )
        conn.execute("update kb_meta set value = (value::bigint + 1)::text where key = 'kb_version'")
