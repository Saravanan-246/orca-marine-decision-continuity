from src.core.database import db
from src.engines.conflict_engine import check_pair
from src.models.commitment import MarineCommitment
from src.models.conflict import ConflictResult

def find_conflicts(commitment: MarineCommitment) -> list[ConflictResult]:
    results = []
    for item in db.collection("commitments").find({}):
        if item.get("commitment_id") == commitment.commitment_id or item.get("state") in {"EXPIRED", "VIOLATED"}:
            continue
        existing = MarineCommitment.model_validate({k: v for k, v in item.items() if k != "_id"})
        result = check_pair(commitment, existing)
        if result.conflict:
            result.conflict_id = f"CF-{existing.commitment_id}-{commitment.commitment_id}"
            results.append(result)
    return results
