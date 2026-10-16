import uuid

ATT = {
    "id": str(uuid.uuid4()),
    "question_id": "HUK2011-kurulus-q01",
    "kind": "mcq",
    "selected_option": 2,
    "correct": True,
    "created_at": "2026-10-16T10:00:00Z",
}
REV = {"id": str(uuid.uuid4()), "card_id": "HUK2011-kurulus-k01", "grade": "good", "reviewed_at": "2026-10-16T10:00:00Z"}


def state(updated_at, interval):
    return {
        "card_id": "HUK2011-kurulus-k01", "ease": 2.5, "interval_days": interval, "repetitions": 1,
        "due_at": "2026-10-17T10:00:00Z", "last_grade": "good", "updated_at": updated_at,
    }


def test_sync_twice_does_not_duplicate(auth_client, sql):
    payload = {"attempts": [ATT], "card_reviews": [REV], "card_states": [state("2026-10-16T10:00:00Z", 1)]}
    assert auth_client.post("/progress/sync", json=payload).status_code == 200
    r = auth_client.post("/progress/sync", json=payload)
    assert r.status_code == 200 and r.json()["ok"] is True
    assert sql.execute("select count(*) from attempts").fetchone()[0] == 1
    assert sql.execute("select count(*) from card_reviews").fetchone()[0] == 1
    assert sql.execute("select count(*) from card_states").fetchone()[0] == 1


def test_older_card_state_does_not_overwrite_newer(auth_client, sql):
    auth_client.post("/progress/sync", json={"card_states": [state("2026-10-16T12:00:00Z", 6)]})
    auth_client.post("/progress/sync", json={"card_states": [state("2026-10-16T09:00:00Z", 1)]})
    assert sql.execute("select interval_days from card_states").fetchone()[0] == 6


def test_newer_card_state_overwrites(auth_client, sql):
    auth_client.post("/progress/sync", json={"card_states": [state("2026-10-16T09:00:00Z", 1)]})
    auth_client.post("/progress/sync", json={"card_states": [state("2026-10-16T12:00:00Z", 6)]})
    assert sql.execute("select interval_days from card_states").fetchone()[0] == 6


def test_progress_all_returns_everything(auth_client):
    auth_client.post("/progress/sync", json={"attempts": [ATT], "card_reviews": [REV], "card_states": [state("2026-10-16T10:00:00Z", 1)]})
    body = auth_client.get("/progress/all").json()
    assert body["attempts"][0]["id"] == ATT["id"]
    assert body["attempts"][0]["correct"] is True
    assert body["card_reviews"][0]["grade"] == "good"
    assert body["card_states"][0]["interval_days"] == 1


def test_invalid_grade_is_rejected(auth_client):
    bad = dict(REV, grade="super")
    assert auth_client.post("/progress/sync", json={"card_reviews": [bad]}).status_code == 422


NOTE = {"topic_id": "HUK2011-kurulus", "body_md": "Öneriye davet ≠ öneri", "updated_at": "2026-10-16T10:00:00Z"}
HL = {
    "id": str(uuid.uuid4()), "topic_id": "HUK2011-kurulus", "section": "content", "block_hash": "a1b2",
    "excerpt": "TBK m. 8'e göre...", "deleted": False, "updated_at": "2026-10-16T10:00:00Z",
}


def test_topic_notes_and_highlights_sync_and_restore(auth_client):
    r = auth_client.post("/progress/sync", json={"topic_notes": [NOTE], "highlights": [HL]})
    assert r.status_code == 200
    body = auth_client.get("/progress/all").json()
    assert body["topic_notes"][0]["body_md"] == "Öneriye davet ≠ öneri"
    assert body["highlights"][0]["block_hash"] == "a1b2"


def test_older_note_does_not_overwrite_newer(auth_client):
    auth_client.post("/progress/sync", json={"topic_notes": [dict(NOTE, body_md="yeni", updated_at="2026-10-16T12:00:00Z")]})
    auth_client.post("/progress/sync", json={"topic_notes": [dict(NOTE, body_md="eski", updated_at="2026-10-16T09:00:00Z")]})
    assert auth_client.get("/progress/all").json()["topic_notes"][0]["body_md"] == "yeni"


def test_deleted_highlight_is_not_restored(auth_client):
    auth_client.post("/progress/sync", json={"highlights": [HL]})
    auth_client.post("/progress/sync", json={"highlights": [dict(HL, deleted=True, updated_at="2026-10-16T11:00:00Z")]})
    assert auth_client.get("/progress/all").json()["highlights"] == []
