export type DataStatus = "REAL" | "SIMULATED" | "ASSUMED" | "UNKNOWN";

export type ValueRange = {
  min?: number | null;
  max?: number | null;
  risk_margin?: number;
};

export type Evidence = {
  evidence_id: string;
  parameter: string;
  source: string;
  value: unknown;
  unit?: string | null;
  timestamp: string;
  location?: Record<string, unknown> | null;
  spatial_resolution_km?: number | null;
  temporal_resolution_h?: number | null;
  data_status: DataStatus;
};

export type DecisionDependency = {
  dependency_id: string;
  parameter: string;
  source: string;
  value_at_commit?: unknown;
  valid_range: ValueRange;
  location?: Record<string, unknown> | null;
  spatial_resolution_km?: number | null;
  temporal_resolution_h?: number | null;
  observed_at?: string | null;
  current_value?: unknown;
  status?: string;
  segment_ids: string[];
};

export type CommitmentSegment = {
  segment_id: string;
  label: string;
  start_time: string;
  end_time: string;
  required_conditions?: Record<string, Record<string, number>>;
};

export type MarineCommitmentCreate = {
  commitment_id: string;
  stakeholder_type: string;
  decision_type: string;
  decision_summary: string;
  spatial_scope?: Record<string, unknown> | null;
  temporal_scope?: Record<string, unknown> | null;
  segments: CommitmentSegment[];
  dependencies: DecisionDependency[];
  evidence: Evidence[];
};

export type MarineCommitment = MarineCommitmentCreate & {
  state: string;
  created_at: string;
  updated_at: string;
  version: number;
  last_updated_at: string;
};

export type SegmentIsolation = {
  commitment_id: string;
  affected_segment_ids: string[];
  unaffected_segment_ids: string[];
  triggering_dependency_ids: string[];
  triggering_states: Record<string, string>;
  unverifiable_dependency_ids: string[];
  unmapped_dependency_ids: string[];
  unknown_segment_ids: string[];
  unevaluated_dependency_ids: string[];
  deterministic: boolean;
  could_not_evaluate: boolean;
};

export type SegmentImpact = {
  segment_id: string;
  label: string;
  triggering_dependency_ids: string[];
  triggering_states: Record<string, string>;
  operational_impact: string;
  reasons: string[];
};

export type ImpactAnalysis = {
  commitment_id: string;
  decision_type: string;
  current_commitment_state: string;
  proposed_commitment_state: string;
  operational_impact: string;
  affected_segment_impacts: SegmentImpact[];
  unaffected_segment_ids: string[];
  triggering_dependency_ids: string[];
  isolation: SegmentIsolation;
  deterministic: boolean;
  could_not_evaluate: boolean;
};

export type DependencyResult = {
  dependency_id: string;
  previous_value?: unknown;
  current_value?: unknown;
  previous_status?: string;
  status: string;
  affected_segments: string[];
  reason: string;
  timestamp?: string;
  source?: string;
  observed_at?: string | null;
  evidence_id?: string | null;
  data_status?: string | null;
  freshness_hours?: number | null;
};

export type ReevaluateResponse = {
  commitment_id: string;
  previous_state: string;
  state: string;
  results: DependencyResult[];
  segment_isolation: SegmentIsolation;
  impact_analysis: ImpactAnalysis;
};

export type RepairOption = {
  option_id: string;
  repair_type: string;
  affected_segments: string[];
  changes: Record<string, unknown>;
  disruption_score: number;
  reason: string;
};

export type RepairProposal = {
  repair_id: string;
  commitment_id: string;
  violated_dependency_id: string;
  affected_segments: string[];
  preserved_segments: string[];
  options: RepairOption[];
  selected_option?: string | null;
  disruption_score?: number | null;
  reason: string;
  requires_human_approval: boolean;
  status: string;
  previous_value?: unknown;
  current_value?: unknown;
  created_at: string;
  updated_at: string;
  version: number;
};

export type MarineValue = {
  value?: unknown;
  unit?: string | null;
  data_status?: DataStatus;
  source?: string | null;
};

export type MarineState = {
  state_id: string;
  location: Record<string, unknown>;
  timestamp: string;
  wind?: MarineValue;
  wave?: MarineValue;
  current?: MarineValue;
  pfz?: MarineValue;
  hazards?: Record<string, unknown>[];
  sources?: string[];
  freshness?: string | null;
  data_status?: DataStatus;
  version?: number;
  last_updated_at?: string;
};

export type VoiceIntent = {
  stakeholder_type?: string;
  decision_type?: string;
  raw_text?: string;
  location?: Record<string, unknown> | null;
};

export type VoiceServiceResponse = {
  status: string;
  data_status: string;
  stakeholder_type: string;
  decision_type: string;
  evidence_count: number;
  summary: string;
  speech_text: string;
};

export type VoiceTextResponse = {
  input_text: string;
  intent: VoiceIntent;
  context: Record<string, unknown>;
  response: VoiceServiceResponse;
};
