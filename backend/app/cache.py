import json
from functools import lru_cache
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from .config import get_settings


@lru_cache
def get_redis() -> Redis:
    return Redis.from_url(
        get_settings().redis_url,
        decode_responses=True,
        socket_connect_timeout=0.2,
        socket_timeout=0.2,
    )


def get_json(key: str) -> list[dict[str, Any]] | None:
    try:
        cached_value = get_redis().get(key)
        return json.loads(cached_value) if cached_value else None
    except (RedisError, json.JSONDecodeError):
        return None


def set_json(key: str, value: list[dict[str, Any]], ttl_seconds: int = 60) -> None:
    try:
        get_redis().set(key, json.dumps(value), ex=ttl_seconds)
    except RedisError:
        pass


def delete(key: str) -> None:
    try:
        get_redis().delete(key)
    except RedisError:
        pass
