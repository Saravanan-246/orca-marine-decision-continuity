import { isNotFoundError, orcaClient } from "./client";
import type {
  Evidence,
  MarineCommitment,
  MarineCommitmentCreate,
  MarineState,
  ReevaluateResponse,
  RepairProposal,
} from "./types";

function commitmentPath(commitmentId: string, suffix = ""): string {
  return `/commitments/${encodeURIComponent(commitmentId)}${suffix}`;
}

export async function createCommitment(
  payload: MarineCommitmentCreate,
): Promise<MarineCommitment> {
  const response = await orcaClient.post<MarineCommitment>(
    "/commitments",
    payload,
  );
  return response.data;
}

export async function getCommitment(
  commitmentId: string,
): Promise<MarineCommitment> {
  const response = await orcaClient.get<MarineCommitment>(
    commitmentPath(commitmentId),
  );
  return response.data;
}

export async function listCommitments(): Promise<MarineCommitment[]> {
  const response = await orcaClient.get<MarineCommitment[]>(
    "/commitments",
  );
  return response.data;
}

export async function reevaluateCommitment(
  commitmentId: string,
  body: { evidence?: Evidence[] } | Record<string, unknown>,
): Promise<ReevaluateResponse> {
  const response = await orcaClient.post<ReevaluateResponse>(
    commitmentPath(commitmentId, "/reevaluate"),
    body,
  );
  return response.data;
}

export async function proposeRepair(
  commitmentId: string,
  body: {
    dependency_id: string;
    current_value?: unknown;
    affected_segments: string[];
  },
): Promise<RepairProposal> {
  const response = await orcaClient.post<RepairProposal>(
    commitmentPath(commitmentId, "/repair"),
    body,
  );
  return response.data;
}

export async function listRepairs(
  commitmentId: string,
): Promise<RepairProposal[]> {
  const response = await orcaClient.get<RepairProposal[]>(
    commitmentPath(commitmentId, "/repairs"),
  );
  return response.data;
}

export async function approveRepair(
  repairId: string,
  evidence?: Evidence[],
): Promise<RepairProposal> {
  const response = await orcaClient.post<RepairProposal>(
    `/repairs/${encodeURIComponent(repairId)}/approve`,
    evidence ? { evidence } : {},
  );
  return response.data;
}

export async function rejectRepair(
  repairId: string,
): Promise<RepairProposal> {
  const response = await orcaClient.post<RepairProposal>(
    `/repairs/${encodeURIComponent(repairId)}/reject`,
  );
  return response.data;
}

export async function ingestOsfState(
  lat: number,
  lon: number,
): Promise<MarineState> {
  const response = await orcaClient.post<MarineState>(
    "/marine/state/osf",
    {},
    { params: { lat, lon }, timeout: 60000 },
  );
  return response.data;
}

export async function getLatestMarineState(): Promise<MarineState | null> {
  try {
    const response = await orcaClient.get<MarineState>(
      "/marine/state/latest",
    );
    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}
