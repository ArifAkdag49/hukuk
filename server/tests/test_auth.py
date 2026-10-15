from conftest import TEST_PASSWORD


def test_health_needs_no_token(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_login_with_correct_password_returns_token(client):
    r = client.post("/auth/login", json={"password": TEST_PASSWORD})
    assert r.status_code == 200
    assert isinstance(r.json()["token"], str) and len(r.json()["token"]) > 20


def test_login_with_wrong_password_is_401(client):
    r = client.post("/auth/login", json={"password": "yanlis"})
    assert r.status_code == 401


def test_protected_route_without_token_is_401(client):
    assert client.get("/kb/version").status_code == 401


def test_protected_route_with_garbage_token_is_401(client):
    r = client.get("/kb/version", headers={"Authorization": "Bearer abc.def.ghi"})
    assert r.status_code == 401


def test_protected_route_with_token_passes(auth_client):
    assert auth_client.get("/kb/version").status_code == 200


def test_sixth_login_attempt_in_a_minute_is_429(client):
    for _ in range(5):
        client.post("/auth/login", json={"password": "yanlis"})
    r = client.post("/auth/login", json={"password": TEST_PASSWORD})
    assert r.status_code == 429


def test_base64_encoded_hash_from_script_is_accepted(monkeypatch):
    from app import auth
    from app.config import get_settings
    from scripts.sifre_ozeti import ozet

    monkeypatch.setattr(get_settings(), "app_password_hash", ozet("gizli-1"))
    assert auth.verify_password("gizli-1")
    assert not auth.verify_password("gizli-2")
