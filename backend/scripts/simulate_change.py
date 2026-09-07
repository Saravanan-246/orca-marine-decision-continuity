import sys
from src.services.commitment_service import get_commitment
from src.engines.dependency_engine import evaluate_dependency

commitment = get_commitment(sys.argv[1] if len(sys.argv) > 1 else "C-1042")
dependency = next(item for item in commitment.dependencies if item.parameter == "wave_height")
result = evaluate_dependency(dependency, 2.3)
print({"status": result.status.value, "reason": result.reason, "affected_segments": result.affected_segments})
