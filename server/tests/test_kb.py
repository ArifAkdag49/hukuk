import json


def seed(sql):
    sql.execute("insert into courses (id, code, name, year, sort_order) values ('HUK2011','HUK2011','Borçlar Hukuku Genel Hükümler',2,1)")
    sql.execute("insert into units (id, course_id, title, sort_order) values ('HUK2011-u01','HUK2011','Sözleşmeden doğan borçlar',1)")
    sql.execute(
        "insert into topics (id, unit_id, course_id, title, sort_order, summary_md, glossary, verification_status) "
        "values ('HUK2011-kurulus','HUK2011-u01','HUK2011','Sözleşmenin kurulması',1,'İcap ve kabul.',%s,'verified')",
        [json.dumps([{"term": "İcap", "definition": "Öneri"}])],
    )
    sql.execute(
        "insert into topic_articles (topic_id, sort_order, law_name, law_no, article_no, official_text, verified) "
        "values ('HUK2011-kurulus',1,'Türk Borçlar Kanunu','6098','1','Sözleşme, tarafların iradelerini...',true)"
    )
    sql.execute(
        "insert into topic_cases (topic_id, court, chamber, esas_no, karar_no, decision_date, summary_md, verified) "
        "values ('HUK2011-kurulus','Yargıtay','3. HD','2020/1','2020/2','01.01.2020','Özet',true)"
    )
    sql.execute(
        "insert into questions (id, topic_id, course_id, sort_order, kind, stem_md, options, correct_option, explanation_md) "
        "values ('HUK2011-kurulus-q01','HUK2011-kurulus','HUK2011',1,'mcq','Soru?',%s,2,'Çünkü')",
        [json.dumps(["a", "b", "c", "d"])],
    )
    sql.execute(
        "insert into flashcards (id, topic_id, course_id, sort_order, front_md, back_md) "
        "values ('HUK2011-kurulus-k01','HUK2011-kurulus','HUK2011',1,'Ön','Arka')"
    )
    sql.execute(
        "insert into comparison_tables (id, course_id, title, columns, rows, related_topic_ids) "
        "values ('HUK2011-t01','HUK2011','Yokluk / butlan',%s,%s,'{HUK2011-kurulus}')",
        [json.dumps(["", "Yokluk", "Butlan"]), json.dumps([["Sonuç", "Hiç doğmaz", "Kesin hükümsüz"]])],
    )


def test_export_on_empty_db_has_empty_lists(auth_client):
    r = auth_client.get("/kb/export")
    assert r.status_code == 200
    body = r.json()
    for key in ("courses", "units", "topics", "questions", "flashcards", "tables"):
        assert body[key] == []
    assert body["version"] == "0"


def test_export_nests_articles_and_cases_under_topics(auth_client, sql):
    seed(sql)
    body = auth_client.get("/kb/export").json()
    assert [c["id"] for c in body["courses"]] == ["HUK2011"]
    topic = body["topics"][0]
    assert topic["glossary"] == [{"term": "İcap", "definition": "Öneri"}]
    assert topic["articles"][0]["article_no"] == "1"
    assert topic["articles"][0]["verified"] is True
    assert topic["cases"][0]["chamber"] == "3. HD"
    assert "search_tsv" not in topic
    q = body["questions"][0]
    assert q["options"] == ["a", "b", "c", "d"] and q["correct_option"] == 2
    assert body["flashcards"][0]["front_md"] == "Ön"
    assert body["tables"][0]["rows"] == [["Sonuç", "Hiç doğmaz", "Kesin hükümsüz"]]
    assert body["tables"][0]["related_topic_ids"] == ["HUK2011-kurulus"]


def test_create_and_update_course(auth_client):
    r = auth_client.post("/kb/courses", json={"code": "HUK3099", "name": "Deneme Dersi", "year": 3})
    assert r.status_code == 200
    assert r.json()["id"] == "HUK3099"
    r = auth_client.patch("/kb/courses/HUK3099", json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert auth_client.get("/kb/version").json()["version"] == "2"


def test_patch_unknown_course_is_404(auth_client):
    assert auth_client.patch("/kb/courses/YOK", json={"name": "x"}).status_code == 404
