from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException

_ALGORITHM = "HS256"
_DEFAULT_SECRET = "dev-only-change-jwt-secret-in-env"
_DEFAULT_EXPIRE_DAYS = 7


def _secret() -> str:
    return os.getenv("JWT_SECRET_KEY", _DEFAULT_SECRET)


def _expire_days() -> int:
    raw = os.getenv("JWT_EXPIRE_DAYS", str(_DEFAULT_EXPIRE_DAYS))
    try:
        return max(1, int(raw))
    except ValueError:
        return _DEFAULT_EXPIRE_DAYS


def create_access_token(*, user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=_expire_days()),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="登入已過期或無效，請重新登入") from e
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="無效的登入憑證")
    return str(sub)
