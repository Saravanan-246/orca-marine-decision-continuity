from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def replace_one(
    collection: Any,
    query: dict[str, Any],
    replacement: dict[str, Any],
) -> bool:
    """
    Replace exactly one existing document.

    Supports:
    - PyMongo collections
    - project MemoryCollection

    Returns True when a document matched and was replaced.
    Returns False when no matching document exists.
    """
    _validate_query(query)
    _validate_document(replacement)

    mongo_replace = getattr(
        collection,
        "replace_one",
        None,
    )

    if callable(mongo_replace):
        result = mongo_replace(
            query,
            dict(replacement),
            upsert=False,
        )

        return result.matched_count == 1

    items = _memory_items(collection)

    for key, document in tuple(items.items()):
        if _matches(document, query):
            items[key] = dict(replacement)
            return True

    return False


def insert_one(
    collection: Any,
    document: dict[str, Any],
) -> str:
    """
    Insert one document and return its id.
    """
    _validate_document(document)

    if "_id" not in document:
        raise ValueError(
            "document must contain '_id'"
        )

    mongo_insert = getattr(
        collection,
        "insert_one",
        None,
    )

    if not callable(mongo_insert):
        raise TypeError(
            "unsupported collection type"
        )

    result = mongo_insert(
        dict(document)
    )

    inserted_id = getattr(
        result,
        "inserted_id",
        document["_id"],
    )

    return str(inserted_id)


def find_one(
    collection: Any,
    query: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Find one document using a database-agnostic interface.
    """
    _validate_query(query)

    mongo_find = getattr(
        collection,
        "find_one",
        None,
    )

    if callable(mongo_find):
        result = mongo_find(query)

        if result is None:
            return None

        return dict(result)

    items = _memory_items(collection)

    for document in items.values():
        if _matches(document, query):
            return dict(document)

    return None


def find_many(
    collection: Any,
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Find multiple documents.

    Empty query means all documents.
    """
    normalized_query = query or {}

    if not isinstance(
        normalized_query,
        dict,
    ):
        raise TypeError(
            "query must be a dictionary"
        )

    mongo_find = getattr(
        collection,
        "find",
        None,
    )

    if not callable(mongo_find):
        raise TypeError(
            "unsupported collection type"
        )

    results = mongo_find(
        normalized_query
    )

    return [
        dict(item)
        for item in results
    ]


def _validate_query(
    query: dict[str, Any],
) -> None:
    if not isinstance(query, dict):
        raise TypeError(
            "query must be a dictionary"
        )

    if not query:
        raise ValueError(
            "query must not be empty"
        )


def _validate_document(
    document: dict[str, Any],
) -> None:
    if not isinstance(document, dict):
        raise TypeError(
            "document must be a dictionary"
        )


def _memory_items(
    collection: Any,
) -> dict[str, dict[str, Any]]:
    """
    Return the backing dictionary used by MemoryCollection.
    """
    items = getattr(
        collection,
        "items",
        None,
    )

    if not isinstance(items, dict):
        raise TypeError(
            "unsupported collection type; expected "
            "PyMongo collection or MemoryCollection"
        )

    return items


def _matches(
    document: dict[str, Any],
    query: dict[str, Any],
) -> bool:
    for field, condition in query.items():
        actual = _get_field(
            document,
            field,
        )

        if isinstance(condition, dict):
            if not _match_condition(
                actual,
                condition,
            ):
                return False

        elif actual != condition:
            return False

    return True


def _match_condition(
    actual: Any,
    condition: dict[str, Any],
) -> bool:
    for operator, expected in condition.items():

        if operator == "$eq":
            if actual != expected:
                return False

        elif operator == "$ne":
            if actual == expected:
                return False

        elif operator == "$in":
            if not _contains(
                expected,
                actual,
            ):
                return False

        elif operator == "$nin":
            if _contains(
                expected,
                actual,
            ):
                return False

        elif operator == "$gte":
            if actual is None or actual < expected:
                return False

        elif operator == "$gt":
            if actual is None or actual <= expected:
                return False

        elif operator == "$lte":
            if actual is None or actual > expected:
                return False

        elif operator == "$lt":
            if actual is None or actual >= expected:
                return False

        else:
            raise ValueError(
                f"unsupported query operator: {operator}"
            )

    return True


def _contains(
    values: Any,
    target: Any,
) -> bool:
    if isinstance(
        values,
        (str, bytes),
    ):
        return target in values

    if not isinstance(
        values,
        Iterable,
    ):
        raise TypeError(
            "query operator expects an iterable"
        )

    return target in values


def _get_field(
    document: dict[str, Any],
    field: str,
) -> Any:
    """
    Supports dotted Mongo-style paths such as:

    dependencies.status
    metadata.source
    """
    current: Any = document

    for part in field.split("."):
        if not isinstance(
            current,
            dict,
        ):
            return None

        current = current.get(part)

    return current