from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock
from typing import Any


@dataclass
class CacheRecord:
    key: str
    value: Any
    version: int
    updated_at: datetime
    expires_at: datetime | None = None
    stale: bool = False

    def is_stale(self) -> bool:
        if self.stale:
            return True

        if self.expires_at is None:
            return False

        return datetime.now(timezone.utc) >= self.expires_at


class OfflineCache:
    def __init__(self) -> None:
        self._records: dict[str, CacheRecord] = {}
        self._lock = RLock()

    def put(
        self,
        key: str,
        value: Any,
        version: int = 1,
        updated_at: datetime | None = None,
        expires_at: datetime | None = None,
    ) -> CacheRecord:
        key = self._normalize_key(key)

        if version < 1:
            raise ValueError("version must be >= 1")

        normalized_updated_at = (
            self._normalize_timestamp(updated_at)
            if updated_at is not None
            else datetime.now(timezone.utc)
        )

        normalized_expires_at = (
            self._normalize_timestamp(expires_at)
            if expires_at is not None
            else None
        )

        if (
            normalized_expires_at is not None
            and normalized_expires_at < normalized_updated_at
        ):
            raise ValueError(
                "expires_at cannot be earlier than updated_at"
            )

        with self._lock:
            existing = self._records.get(key)

            # Never allow an older version to overwrite a newer one.
            if existing is not None and version < existing.version:
                return existing

            record = CacheRecord(
                key=key,
                value=value,
                version=version,
                updated_at=normalized_updated_at,
                expires_at=normalized_expires_at,
                stale=False,
            )

            self._records[key] = record
            return record

    def get(self, key: str) -> CacheRecord | None:
        key = self._normalize_key(key)

        with self._lock:
            return self._records.get(key)

    def get_fresh(self, key: str) -> CacheRecord | None:
        record = self.get(key)

        if record is None:
            return None

        return None if record.is_stale() else record

    def mark_stale(self, key: str) -> bool:
        key = self._normalize_key(key)

        with self._lock:
            record = self._records.get(key)

            if record is None:
                return False

            record.stale = True
            return True

    def remove(self, key: str) -> bool:
        key = self._normalize_key(key)

        with self._lock:
            return self._records.pop(key, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._records.clear()

    def contains(self, key: str) -> bool:
        key = self._normalize_key(key)

        with self._lock:
            return key in self._records

    def size(self) -> int:
        with self._lock:
            return len(self._records)

    @staticmethod
    def _normalize_key(key: str) -> str:
        if not isinstance(key, str):
            raise ValueError("cache key must be a string")

        key = key.strip()

        if not key:
            raise ValueError("cache key must not be empty")

        return key

    @staticmethod
    def _normalize_timestamp(value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError(
                "timestamp must be timezone-aware"
            )

        return value.astimezone(timezone.utc)


cache = OfflineCache()
