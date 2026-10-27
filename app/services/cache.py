"""Lightweight, thread-safe in-memory TTL cache for dashboard metrics and queries."""

import time
from threading import Lock
from typing import Any

_lock = Lock()
_cache: dict[str, tuple[float, Any]] = {}


def get_cache(key: str) -> Any | None:
    now = time.time()
    with _lock:
        item = _cache.get(key)
        if item is None:
            return None
        expires_at, val = item
        if now > expires_at:
            _cache.pop(key, None)
            return None
        return val


def set_cache(key: str, val: Any, ttl_seconds: int = 15) -> None:
    expires_at = time.time() + max(1, ttl_seconds)
    with _lock:
        _cache[key] = (expires_at, val)


def invalidate_cache_prefix(prefix: str) -> int:
    removed = 0
    with _lock:
        keys_to_remove = [k for k in _cache if k.startswith(prefix)]
        for k in keys_to_remove:
            _cache.pop(k, None)
            removed += 1
    return removed


def clear_cache() -> None:
    with _lock:
        _cache.clear()
