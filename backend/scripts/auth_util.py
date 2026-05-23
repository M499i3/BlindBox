"""Password hashing for seeds and future auth."""

from __future__ import annotations

import bcrypt

DEFAULT_DEV_PASSWORD = "password"


def hash_password(plain: str = DEFAULT_DEV_PASSWORD) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False
