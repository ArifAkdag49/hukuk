"""İçerik hattının yükleme adımı: kimlikler sabit, tekrar yükleme çoğaltmaz."""

from pipeline import load

COURSE = {"id": "HUK2011", "code": "HUK2011", "name": "Borçlar Hukuku Genel Hükümler", "year": 2, "sort_order": 1}


def topic_doc(n_mcq=2, title="Sözleşmenin kurulması"):
    return {
        "course_id": "HUK2011",
        "unit_index": 1,
        "unit_title": "Sözleşmeden doğan borçlar",
        "topic_index": 1,
        "slug": "kurulus",
        "title": title,
        "model": "claude-opus-5-5",
        "generated_at": "2026-10-16T22:00:00+00:00",
        "skill_refs": ["borclar-hukuku-genel/sozlesmenin-kurulusu-ve-sekil"],
        "content": {
            "summary_md": "Özet", "content_md": "Anlatım", "critical_md": "Kritik", "doctrine_md": "Doktrin",
            "glossary": [{"term": "İcap", "definition": "Öneri"}],
        },
        "articles": [
            {"law_name": "TÜRK BORÇLAR KANUNU", "law_no": "6098", "article_no": "1", "official_text": "MADDE 1-", "source_url": "u", "verified": True},
        ],
        "cases": [
            {"court": "Yargıtay", "chamber": "3. Hukuk Dairesi", "esas_no": "2018/1", "karar_no": "2018/2", "decision_date": "01.01.2018", "summary_md": "Özet", "source_url": "u", "verified": True},
        ],
        "mcq": [
            {"stem_md": f"Soru {i}", "options": ["a", "b", "c", "d"], "correct_option": 1, "explanation_md": "e"}
            for i in range(n_mcq)
        ],
        "cases_q": [
            {"stem_md": "Olay", "rubric": [{"point": "p", "weight": 100, "madde_ref": "TBK m. 1"}], "model_answer_md": "Cevap"},
        ],
        "cards": [{"front_md": "Ön", "back_md": "Arka"}],
        "verification": {"status": "verified", "issues": []},
    }


def test_load_assigns_stable_ids(client, sql):
    load.load_course(COURSE, [topic_doc()], tables=[])
    ids = [r[0] for r in sql.execute("select id from questions order by id").fetchall()]
    assert ids == ["HUK2011-kurulus-o01", "HUK2011-kurulus-q01", "HUK2011-kurulus-q02"]
    assert sql.execute("select id from flashcards").fetchone()[0] == "HUK2011-kurulus-k01"
    assert sql.execute("select id, unit_id from topics").fetchone() == ("HUK2011-kurulus", "HUK2011-u01")


def test_loading_twice_keeps_counts_and_updates_content(client, sql):
    load.load_course(COURSE, [topic_doc()], tables=[])
    load.load_course(COURSE, [topic_doc(title="Sözleşmenin kuruluşu")], tables=[])
    count = lambda t: sql.execute(f"select count(*) from {t}").fetchone()[0]
    assert (count("topics"), count("questions"), count("flashcards"), count("topic_articles"), count("topic_cases")) == (1, 3, 1, 1, 1)
    assert sql.execute("select title from topics").fetchone()[0] == "Sözleşmenin kuruluşu"


def test_regeneration_with_fewer_questions_removes_extras(client, sql):
    load.load_course(COURSE, [topic_doc(n_mcq=3)], tables=[])
    load.load_course(COURSE, [topic_doc(n_mcq=1)], tables=[])
    ids = [r[0] for r in sql.execute("select id from questions where kind='mcq'").fetchall()]
    assert ids == ["HUK2011-kurulus-q01"]


def test_load_bumps_kb_version_and_stores_tables(client, sql):
    load.load_course(
        COURSE, [topic_doc()],
        tables=[{"title": "Yokluk / butlan", "columns": ["", "A", "B"], "rows": [["x", "1", "2"]], "related_slugs": ["kurulus", "yok"]}],
    )
    assert sql.execute("select value from kb_meta where key='kb_version'").fetchone()[0] == "1"
    row = sql.execute("select id, related_topic_ids from comparison_tables").fetchone()
    assert row == ("HUK2011-t01", ["HUK2011-kurulus"])


def test_note_questions_survive_course_reload(client, sql):
    load.load_course(COURSE, [topic_doc()], tables=[])
    sql.execute("insert into notes (id, course_id, title, file_path, mime, status) values ('00000000-0000-0000-0000-000000000001','HUK2011','n','f','application/pdf','ready')")
    sql.execute(
        "insert into questions (id, course_id, kind, stem_md, origin, note_id) "
        "values ('note-1-q01','HUK2011','mcq','s','note','00000000-0000-0000-0000-000000000001')"
    )
    load.load_course(COURSE, [topic_doc()], tables=[])
    assert sql.execute("select count(*) from questions where origin='note'").fetchone()[0] == 1


def test_shuffle_options_keeps_correct_answer_and_drops_malformed():
    from pipeline.generate import shuffle_options

    qs = [
        {"stem_md": "s", "options": ["doğru", "y1", "y2", "y3"], "correct_option": 0, "explanation_md": "e"},
        {"stem_md": "bozuk", "options": ["a", "b"], "correct_option": 0, "explanation_md": "e"},
    ]
    out = shuffle_options(qs * 1, seed="x")
    assert len(out) == 1
    assert out[0]["options"][out[0]["correct_option"]] == "doğru"
    assert shuffle_options(qs, seed="x") == out  # deterministik
