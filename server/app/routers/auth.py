from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .. import auth

router = APIRouter()


class LoginIn(BaseModel):
    password: str


@router.post("/auth/login")
def login(body: LoginIn, request: Request):
    auth.check_rate_limit(request.client.host if request.client else "?")
    if not auth.verify_password(body.password):
        raise HTTPException(401, "Şifre yanlış")
    return {"token": auth.issue_token()}
