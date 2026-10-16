import os
import pathlib

import bcrypt
import psycopg
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://hukuk:hukuk@127.0.0.1:5446/hukuk_test"
)
TEST_PASSWORD = "test-sifre-123"

# Uygulama içe aktarılmadan önce ayarlanmalı: Settings ilk erişimde okunuyor.
os.environ["DATABASE_URL"] = TEST_DB
os.environ["APP_PASSWORD_HASH"] = bcrypt.hashpw(
    TEST_PASSWORD.encode(), bcrypt.gensalt(rounds=4)
).decode()
os.environ["JWT_SECRET"] = "test-jwt-secret-test-jwt-secret-1234"
os.environ["ANTHROPIC_API_KEY"] = "test-anahtar"
os.environ["MCP_ENABLED"] = "false"
os.environ["AI_MONTHLY_CAP_USD"] = "50"
os.environ["UPLOAD_DIR"] = str(ROOT / ".superpowers" / "test-uploads")

# 000_test_db.sql yalnız Docker ilk kurulumunda; şema dosyaları sırayla uygulanır
SCHEMA = "\n".join(
    p.read_text(encoding="utf-8") for p in sorted((ROOT / "db").glob("0*.sql")) if not p.name.startswith("000")
)

TABLES = [
    "highlights", "topic_notes", "api_usage", "chat_messages", "chat_threads", "card_states", "card_reviews",
    "attempts", "comparison_tables", "flashcards", "questions", "note_topics",
    "notes", "topic_cases", "topic_articles", "topics", "units", "courses",
]


@pytest.fixture(scope="session", autouse=True)
def _schema():
    with psycopg.connect(TEST_DB, autocommit=True) as conn:
        conn.execute(SCHEMA)


@pytest.fixture(autouse=True)
def _clean(_schema):
    with psycopg.connect(TEST_DB, autocommit=True) as conn:
        conn.execute("truncate " + ", ".join(TABLES) + " cascade")
        conn.execute("update kb_meta set value = '0' where key = 'kb_version'")
    from app import auth

    auth.reset_rate_limit()
    yield


@pytest.fixture
def sql():
    """Testlerde doğrudan veri hazırlamak için senkron bağlantı."""
    with psycopg.connect(TEST_DB, autocommit=True) as conn:
        yield conn


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c


@pytest.fixture
def auth_client(client):
    r = client.post("/auth/login", json={"password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    client.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return client
