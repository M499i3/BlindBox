"""
Lightweight in-process TTL cache for FastAPI endpoints.

No external dependencies — just a module-level dict + time.monotonic().
Intended for slow-moving, read-heavy data (rankings, trending tags).

Usage:
    from infrastructure.simple_cache import ttl_cache

    result = ttl_cache("my_key", ttl=300, fn=lambda: expensive_query())
"""
from __future__ import annotations

import threading
import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")

_store: dict[str, tuple[float, Any]] = {}
_lock = threading.Lock()


def ttl_cache(key: str, ttl: float, fn: Callable[[], T]) -> T:
    """
    Return cached value for *key* if it has not expired, otherwise call *fn*,
    store the result, and return it.

    Args:
        key: cache key (string)
        ttl: time-to-live in seconds
        fn:  zero-argument callable that produces the value
    """
    now = time.monotonic()
    with _lock:
        entry = _store.get(key)
        if entry is not None:
            expires_at, value = entry
            if now < expires_at:
                return value  # type: ignore[return-value]

    # Compute outside the lock so one slow query doesn't block all other keys.
    value = fn()
    with _lock:
        _store[key] = (now + ttl, value)
    return value


def invalidate(key: str) -> None:
    """Remove a single key from the cache."""
    with _lock:
        _store.pop(key, None)


def invalidate_all() -> None:
    """Wipe the entire cache (useful in tests)."""
    with _lock:
        _store.clear()
