import hashlib
import json

def deterministic_id(prefix: str, value: object) -> str:
    digest = hashlib.sha256(json.dumps(value, default=str, sort_keys=True).encode()).hexdigest()[:12]
    return f"{prefix}-{digest}"
