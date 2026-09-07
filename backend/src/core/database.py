import logging
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class MemoryCollection:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    def insert_one(self, document: dict[str, Any]) -> None:
        key = str(document["_id"])
        if key in self.items:
            raise ValueError(f"Duplicate _id: {key}")
        self.items[key] = document.copy()

    def find_one(
        self,
        query: dict[str, Any],
    ) -> dict[str, Any] | None:
        for item in self.items.values():
            if self._matches(item, query):
                return item.copy()
        return None

    def find(
        self,
        query: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        query = query or {}
        return [
            item.copy()
            for item in self.items.values()
            if self._matches(item, query)
        ]

    def _matches(
        self,
        item: dict[str, Any],
        query: dict[str, Any],
    ) -> bool:
        for key, condition in query.items():
            value = item.get(key)

            if isinstance(condition, dict):
                for operator, expected in condition.items():
                    if operator == "$eq" and value != expected:
                        return False

                    if operator == "$ne" and value == expected:
                        return False

                    if operator == "$in" and value not in expected:
                        return False

                    if operator == "$gte" and (
                        value is None or value < expected
                    ):
                        return False

                    if operator == "$gt" and (
                        value is None or value <= expected
                    ):
                        return False

                    if operator == "$lte" and (
                        value is None or value > expected
                    ):
                        return False

                    if operator == "$lt" and (
                        value is None or value >= expected
                    ):
                        return False

            elif value != condition:
                return False

        return True


class Database:
    def __init__(self) -> None:
        self.client: MongoClient | None = None
        self.db: Any = None
        self.memory = False
        self.collections: dict[str, Any] = {}
        self.connect()

    def connect(self) -> None:
        settings = get_settings()

        try:
            client = MongoClient(
                settings.mongo_uri,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
            )

            client.admin.command("ping")

            self.client = client
            self.db = client[settings.mongo_db]
            self.memory = False

            self._create_indexes()

            logger.info(
                "MongoDB connected successfully: %s",
                settings.mongo_db,
            )

        except Exception as exc:
            logger.warning(
                "MongoDB unavailable; using in-memory repository: %s",
                exc,
            )

            self.client = None
            self.db = None
            self.memory = True

    def _create_indexes(self) -> None:
        if self.db is None:
            return

        self.db.marine_states.create_index(
            "state_id",
            unique=True,
        )

        self.db.marine_states.create_index(
            [("timestamp", DESCENDING)],
        )

        self.db.marine_states.create_index(
            [("data_status", ASCENDING)],
        )

        self.db.commitments.create_index(
            "commitment_id",
            unique=True,
        )

        self.db.commitments.create_index(
            [("state", ASCENDING)],
        )

        self.db.commitments.create_index(
            [("stakeholder_type", ASCENDING)],
        )

        self.db.commitments.create_index(
            [("updated_at", DESCENDING)],
        )

        self.db.commitments.create_index(
            [("created_at", DESCENDING)],
        )

        self.db.commitments.create_index(
            "dependencies.dependency_id",
        )

    def collection(self, name: str) -> Any:
        if self.memory:
            return self.collections.setdefault(
                name,
                MemoryCollection(),
            )

        return self.db[name]

    def healthy(self) -> bool:
        if self.memory or not self.client:
            return False

        try:
            self.client.admin.command("ping")
            return True
        except Exception:
            return False


db = Database()