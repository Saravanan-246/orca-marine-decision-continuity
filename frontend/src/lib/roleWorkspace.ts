import {
  formatMapLocation,
  formatSegmentIds,
  readDecision,
  readLastEvidence,
  readLastMonitor,
  readLocalCommitment,
  readMapLocation,
  readTripDraft,
  type LocalCommitment,
  type Trip,
} from "./orcaSession";
import type { Evidence, ReevaluateResponse } from "../api/types";

export type WorkspaceSnapshot = {
  commitment: LocalCommitment | null;
  decision: Trip | null;
  draft: Trip | null;
  monitor: ReevaluateResponse | null;
  evidence: Evidence[];
  location: ReturnType<typeof readMapLocation>;
};

export function readWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    commitment: readLocalCommitment(),
    decision: readDecision(),
    draft: readTripDraft(),
    monitor: readLastMonitor(),
    evidence: readLastEvidence() ?? [],
    location: readMapLocation(),
  };
}

export function locationLabel(): string {
  return formatMapLocation(readMapLocation());
}

export function commitmentSummary(snapshot: WorkspaceSnapshot): string {
  const trip =
    snapshot.commitment?.trip ?? snapshot.decision ?? snapshot.draft;
  if (!trip?.title.trim()) {
    return "No active commitment";
  }
  return trip.title;
}

export function monitorStateLabel(snapshot: WorkspaceSnapshot): string {
  return snapshot.monitor?.state ?? "No monitoring result";
}

export function isolationSummary(snapshot: WorkspaceSnapshot): {
  affected: string;
  preserved: string;
  hasData: boolean;
} | null {
  const isolation = snapshot.monitor?.segment_isolation;
  if (!isolation) {
    return null;
  }
  return {
    affected: formatSegmentIds(isolation.affected_segment_ids),
    preserved: formatSegmentIds(isolation.unaffected_segment_ids),
    hasData:
      isolation.affected_segment_ids.length > 0 ||
      isolation.unaffected_segment_ids.length > 0,
  };
}

export function hazardRecords(
  hazards: Record<string, unknown>[] | undefined,
): { id: string; title: string; area: string; source: string }[] {
  if (!hazards?.length) {
    return [];
  }
  const items: { id: string; title: string; area: string; source: string }[] =
    [];
  hazards.forEach((record, index) => {
    const title = record.title ?? record.type ?? record.name;
    if (typeof title !== "string" || !title.trim()) {
      return;
    }
    items.push({
      id: String(record.id ?? `hazard-${index}`),
      title: title.trim(),
      area: typeof record.area === "string" ? record.area : "Unspecified area",
      source:
        typeof record.source === "string" ? record.source : "Marine state",
    });
  });
  return items;
}
