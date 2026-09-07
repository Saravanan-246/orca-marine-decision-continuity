from datetime import datetime, timedelta, timezone
from src.models.commitment import MarineCommitment, CommitmentSegment
from src.models.dependency import DecisionDependency, ValueRange
from src.models.evidence import Evidence
from src.models.marine import DataStatus
from src.services.commitment_service import create_commitment

now = datetime.now(timezone.utc)
segments = [CommitmentSegment(segment_id=f"SEG-{i}", label=label, start_time=now, end_time=now + timedelta(hours=8)) for i, label in enumerate(("Outbound", "Fishing", "Return"), 1)]
params = [("wave_height", 1.4, 2.0, "m"), ("wind_speed", 12, 18, "kn"), ("current_speed", 0.8, 2.0, "kn"), ("pfz_validity", 1, 1, "boolean")]
deps, evidence = [], []
for parameter, value, maximum, unit in params:
    deps.append(DecisionDependency(dependency_id=f"DEP-{parameter}", parameter=parameter, source="demo", value_at_commit=value, valid_range=ValueRange(min=0, max=maximum), segment_ids=[s.segment_id for s in segments]))
    evidence.append(Evidence(evidence_id=f"E-{parameter}", parameter=parameter, source="demo", value=value, unit=unit, timestamp=now, data_status=DataStatus.SIMULATED))
commitment = create_commitment(MarineCommitment(commitment_id="C-1042", stakeholder_type="fisherman", decision_type="route", decision_summary="Simulated safe fishing route", segments=segments, dependencies=deps, evidence=evidence))
print(commitment.model_dump_json(indent=2))
