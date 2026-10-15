import base64
import time
from collections import defaultdict, deque

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

_bearer = HTTPBearer(auto_error=False)

# Giriş denemesi sınırı: IP başına dakikada 5 (bellekte; tek süreç).
_ATTEMPTS: dict[str, deque] = defaultdict(deque)
_LIMIT = 5
_WINDOW = 60.0


def reset_rate_limit() -> None:
    _ATTEMPTS.clear()


def check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    q = _ATTEMPTS[ip]
    while q and now - q[0] > _WINDOW:
        q.popleft()
    if len(q) >= _LIMIT:
        raise HTTPException(429, "Çok fazla deneme. Bir dakika sonra tekrar deneyin.")
    q.append(now)


def _stored_hash() -> bytes:
    h = get_settings().app_password_hash
    # .env'de base64 (scripts/sifre_ozeti.py), testlerde ham bcrypt özeti
    return h.encode() if h.startswith("$2") else base64.b64decode(h)


def verify_password(password: str) -> bool:
    return bcrypt.checkpw(password.encode(), _stored_hash())


def issue_token() -> str:
    s = get_settings()
    now = int(time.time())
    return jwt.encode({"sub": "ogrenci", "iat": now, "exp": now + s.jwt_days * 86400}, s.jwt_secret, "HS256")


def require_user(
    request: Request, cred: HTTPAuthorizationCredentials | None = Depends(_bearer)
) -> str:
    if cred is None:
        raise HTTPException(401, "Giriş gerekli")
    try:
        payload = jwt.decode(cred.credentials, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Oturum geçersiz")
    return payload["sub"]
