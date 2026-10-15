import json

import pytest

from app import llm
from app.services.grading import Grade, MissedPoint
from fakes import FakeClient


@pytest.fixture
def case_q(sql):
    sql.execute("insert into courses (id, code, name, year) values ('HUK2011','HUK2011','Borçlar',2)")
    sql.execute("insert into units (id, course_id, title) values ('HUK2011-u01','HUK2011','Ü')")
    sql.execute("insert into topics (id, unit_id, course_id, title) values ('HUK2011-t','HUK2011-u01','HUK2011','İrade bozuklukları')")
    sql.execute(
        "insert into questions (id, topic_id, course_id, kind, stem_md, rubric, model_answer_md) "
        "values ('HUK2011-t-o01','HUK2011-t','HUK2011','case','A, B''yi aldatarak...',%s,'Örnek çözüm')",
        [json.dumps([{"point": "Hile tespiti", "weight": 60, "madde_ref": "TBK m. 36"}, {"point": "Süre", "weight": 40, "madde_ref": "TBK m. 39"}])],
    )
    return "HUK2011-t-o01"


@pytest.fixture
def fake():
    g = Grade(
        score=60,
        correct_points=["Hileyi doğru tespit etti"],
        missed=[MissedPoint(point="Bir yıllık hak düşürücü süre", madde_ref="TBK m. 39")],
        missing_discussions=["Üçüncü kişinin hilesi"],
        feedback_md="İyi başlangıç.",
    )
    client = FakeClient(parse_outputs=[g])
    llm.set_client(client)
    yield client
    llm.set_client(None)


def test_grade_returns_feedback_and_model_answer(auth_client, case_q, fake):
    r = auth_client.post("/cases/grade", json={"question_id": case_q, "answer_text": "Hile vardır, sözleşme iptal edilebilir."})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["score"] == 60
    assert body["missed"] == [{"point": "Bir yıllık hak düşürücü süre", "madde_ref": "TBK m. 39"}]
    assert body["model_answer_md"] == "Örnek çözüm"
    kw = fake.calls[0][1]
    assert kw["model"] == llm.OPUS
    prompt = kw["messages"][0]["content"]
    assert "Hile tespiti" in prompt and "Hile vardır" in prompt


def test_score_is_clamped_to_0_100(auth_client, case_q, fake):
    fake.parse_outputs[0].score = 140
    assert auth_client.post("/cases/grade", json={"question_id": case_q, "answer_text": "x"}).json()["score"] == 100


def test_blank_answer_is_422(auth_client, case_q, fake):
    assert auth_client.post("/cases/grade", json={"question_id": case_q, "answer_text": "   "}).status_code == 422


def test_unknown_question_is_404(auth_client, fake):
    assert auth_client.post("/cases/grade", json={"question_id": "yok", "answer_text": "x"}).status_code == 404


def test_grade_is_blocked_when_budget_spent(auth_client, case_q, fake, sql):
    sql.execute("insert into api_usage (feature, model, cost_usd) values ('x','m', 999)")
    r = auth_client.post("/cases/grade", json={"question_id": case_q, "answer_text": "x"})
    assert r.status_code == 402
    assert r.json()["detail"] == "Bu ayın API limiti doldu"
