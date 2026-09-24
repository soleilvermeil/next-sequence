import type { ActivityRow, FieldKey, SequenceState } from "@/lib/types";
import { getRowFieldValue } from "@/lib/sequence";

export type PendingRowKind = "unchanged" | "added" | "modified" | "deleted";

export type FieldDiffKind = "same" | "added" | "removed" | "changed";

export interface PendingDisplayRow {
  /** Stable React key. */
  key: string;
  kind: PendingRowKind;
  /**
   * Index in the effective (pending) sequence.
   * -1 for deleted ghost rows (not part of the live sequence).
   */
  effectiveIndex: number;
  /** Values to show / edit (pending row, or accepted row when deleted). */
  row: ActivityRow;
  /** Accepted counterpart for field diffs; null when the row is newly added. */
  baseline: ActivityRow | null;
}

const COMPARE_FIELDS: FieldKey[] = [
  "activity",
  "duration",
  "anticipatedDifficulties",
  "supportStrategies",
  "activityType",
  "startTime",
  "endTime",
];

function normalizeValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function fieldValuesEqual(
  a: string | number | null,
  b: string | number | null,
): boolean {
  return normalizeValue(a) === normalizeValue(b);
}

export function rowsContentEqual(a: ActivityRow, b: ActivityRow): boolean {
  if (a.id !== b.id) return false;
  if (Boolean(a.aiComment?.trim()) !== Boolean(b.aiComment?.trim())) return false;
  if ((a.aiComment ?? "").trim() !== (b.aiComment ?? "").trim()) return false;
  if (a.startTimeManual !== b.startTimeManual) return false;
  for (const key of COMPARE_FIELDS) {
    if (!fieldValuesEqual(getRowFieldValue(a, key), getRowFieldValue(b, key))) {
      return false;
    }
  }
  return true;
}

export function sequencesEqual(a: SequenceState, b: SequenceState): boolean {
  if (a.title !== b.title) return false;
  if (a.configId !== b.configId) return false;
  if (a.rows.length !== b.rows.length) return false;
  for (let i = 0; i < a.rows.length; i++) {
    if (!rowsContentEqual(a.rows[i], b.rows[i])) return false;
    if (a.rows[i].id !== b.rows[i].id) return false;
  }
  return true;
}

export function getFieldDiffKind(
  kind: PendingRowKind,
  baseline: ActivityRow | null,
  row: ActivityRow,
  key: FieldKey,
): FieldDiffKind {
  if (kind === "added") return "added";
  if (kind === "deleted") return "removed";
  if (kind === "unchanged" || !baseline) return "same";
  const prev = getRowFieldValue(baseline, key);
  const next = getRowFieldValue(row, key);
  if (fieldValuesEqual(prev, next)) return "same";
  if (normalizeValue(prev) === "") return "added";
  if (normalizeValue(next) === "") return "removed";
  return "changed";
}

/** Merge accepted + pending into a display list with deleted ghosts interleaved. */
export function buildPendingDisplayRows(
  accepted: SequenceState,
  pending: SequenceState,
): PendingDisplayRow[] {
  const acceptedById = new Map(accepted.rows.map((r) => [r.id, r]));
  const pendingIdSet = new Set(pending.rows.map((r) => r.id));
  const deletedRows = accepted.rows.filter((r) => !pendingIdSet.has(r.id));
  const emittedDeleted = new Set<string>();
  const result: PendingDisplayRow[] = [];

  const emitDeletedBefore = (acceptedIndex: number) => {
    for (const del of deletedRows) {
      if (emittedDeleted.has(del.id)) continue;
      const delIdx = accepted.rows.findIndex((r) => r.id === del.id);
      if (delIdx < acceptedIndex) {
        result.push({
          key: `deleted:${del.id}`,
          kind: "deleted",
          effectiveIndex: -1,
          row: del,
          baseline: del,
        });
        emittedDeleted.add(del.id);
      }
    }
  };

  for (let i = 0; i < pending.rows.length; i++) {
    const row = pending.rows[i];
    const acceptedIdx = accepted.rows.findIndex((r) => r.id === row.id);
    emitDeletedBefore(acceptedIdx === -1 ? accepted.rows.length : acceptedIdx);

    const baseline = acceptedById.get(row.id) ?? null;
    let kind: PendingRowKind;
    if (!baseline) kind = "added";
    else if (rowsContentEqual(baseline, row)) kind = "unchanged";
    else kind = "modified";

    result.push({
      key: row.id,
      kind,
      effectiveIndex: i,
      row,
      baseline,
    });
  }

  emitDeletedBefore(Number.POSITIVE_INFINITY);

  return result;
}

export function formatDiffValue(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
