import type {
  ActivityRow,
  ActivityType,
  ConfigId,
  ConfigSwitchImpact,
  FieldKey,
  SequenceState,
} from "./types";
import { getConfig } from "./configs";
import { getColumn } from "./columns";
import { addMinutesToTime } from "./time";

export function createRow(partial?: Partial<ActivityRow>): ActivityRow {
  return {
    id: crypto.randomUUID(),
    activity: "",
    duration: null,
    anticipatedDifficulties: "",
    supportStrategies: "",
    activityType: "",
    startTime: null,
    endTime: null,
    startTimeManual: false,
    aiComment: null,
    extras: {},
    ...partial,
  };
}

export function createEmptySequence(configId: ConfigId = "simple"): SequenceState {
  return {
    title: "Untitled lesson",
    configId,
    rows: [createRow(), createRow(), createRow()],
  };
}

/** Midnight anchor when the first row chains from a missing previous end. */
const SEQUENCE_ORIGIN_TIME = "00:00";

/** Recompute start/end times along the sequence. */
export function recomputeTimes(rows: ActivityRow[]): ActivityRow[] {
  let previousEnd: string | null = null;

  return rows.map((row, index) => {
    let startTime = row.startTime;
    if (!row.startTimeManual) {
      // First row has nothing to chain from — use midnight as a stable origin.
      startTime = previousEnd ?? (index === 0 ? SEQUENCE_ORIGIN_TIME : null);
    }
    const endTime = addMinutesToTime(startTime, row.duration);
    previousEnd = endTime ?? previousEnd;
    return { ...row, startTime, endTime };
  });
}

export function fieldHasMeaningfulData(row: ActivityRow, key: FieldKey): boolean {
  switch (key) {
    case "activity":
      return row.activity.trim().length > 0;
    case "duration":
      return row.duration !== null && !Number.isNaN(row.duration);
    case "anticipatedDifficulties":
      return row.anticipatedDifficulties.trim().length > 0;
    case "supportStrategies":
      return row.supportStrategies.trim().length > 0;
    case "activityType":
      return row.activityType !== "";
    case "startTime":
      return Boolean(row.startTime) || row.startTimeManual;
    case "endTime":
      return Boolean(row.endTime);
    default:
      return false;
  }
}

export function analyzeConfigSwitch(
  fromId: ConfigId,
  toId: ConfigId,
  rows: ActivityRow[],
): ConfigSwitchImpact {
  const fromCols = new Set(getConfig(fromId).columns);
  const toCols = new Set(getConfig(toId).columns);
  const droppedColumns = [...fromCols].filter((k) => !toCols.has(k));

  const droppedWithData = droppedColumns
    .filter((key) => !getColumn(key).computed)
    .map((key) => {
      const nonEmptyCount = rows.filter((r) => fieldHasMeaningfulData(r, key)).length;
      return {
        key,
        label: getColumn(key).label,
        nonEmptyCount,
      };
    })
    .filter((d) => d.nonEmptyCount > 0);

  return { fromId, toId, droppedColumns, droppedWithData };
}

export function updateRowField(
  rows: ActivityRow[],
  rowId: string,
  key: FieldKey,
  value: string | number | null,
): ActivityRow[] {
  const next = rows.map((row) => {
    if (row.id !== rowId) return row;

    switch (key) {
      case "activity":
        return { ...row, activity: String(value ?? "") };
      case "duration": {
        if (value === "" || value === null) return { ...row, duration: null };
        const n = typeof value === "number" ? value : Number(value);
        return { ...row, duration: Number.isFinite(n) ? n : null };
      }
      case "anticipatedDifficulties":
        return { ...row, anticipatedDifficulties: String(value ?? "") };
      case "supportStrategies":
        return { ...row, supportStrategies: String(value ?? "") };
      case "activityType":
        return { ...row, activityType: (value as ActivityType) ?? "" };
      case "startTime": {
        const startTime = value ? String(value) : null;
        return {
          ...row,
          startTime,
          startTimeManual: Boolean(startTime),
        };
      }
      case "endTime":
        return row;
      default:
        return row;
    }
  });

  return recomputeTimes(next);
}

export function clearManualStart(rows: ActivityRow[], rowId: string): ActivityRow[] {
  return recomputeTimes(
    rows.map((r) =>
      r.id === rowId ? { ...r, startTimeManual: false, startTime: null } : r,
    ),
  );
}

export function insertRowAt(rows: ActivityRow[], index: number): ActivityRow[] {
  const next = [...rows];
  next.splice(index, 0, createRow());
  return recomputeTimes(next);
}

export function deleteRow(rows: ActivityRow[], rowId: string): ActivityRow[] {
  if (rows.length <= 1) return rows;
  return recomputeTimes(rows.filter((r) => r.id !== rowId));
}

export function moveRow(
  rows: ActivityRow[],
  fromIndex: number,
  toIndex: number,
): ActivityRow[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length ||
    fromIndex === toIndex
  ) {
    return rows;
  }
  const next = [...rows];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return recomputeTimes(next);
}

export function setRowComment(
  rows: ActivityRow[],
  rowId: string,
  comment: string | null,
): ActivityRow[] {
  const text = comment?.trim() ? comment.trim() : null;
  return rows.map((row) => (row.id === rowId ? { ...row, aiComment: text } : row));
}

export function clearRowComment(rows: ActivityRow[], rowId: string): ActivityRow[] {
  return setRowComment(rows, rowId, null);
}

/** Insert a fully specified row (used by AI tools). */
export function insertRowWithData(
  rows: ActivityRow[],
  index: number,
  partial?: Partial<ActivityRow>,
): ActivityRow[] {
  const clamped = Math.max(0, Math.min(index, rows.length));
  const next = [...rows];
  next.splice(clamped, 0, createRow(partial));
  return recomputeTimes(next);
}

export function getRowFieldValue(row: ActivityRow, key: FieldKey): string | number | null {
  switch (key) {
    case "activity":
      return row.activity;
    case "duration":
      return row.duration;
    case "anticipatedDifficulties":
      return row.anticipatedDifficulties;
    case "supportStrategies":
      return row.supportStrategies;
    case "activityType":
      return row.activityType;
    case "startTime":
      return row.startTime;
    case "endTime":
      return row.endTime;
    default:
      return null;
  }
}

/** Cumulative offsets (minutes from sequence start) for each row. */
export function getCumulativeOffsets(rows: ActivityRow[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const row of rows) {
    offsets.push(acc);
    acc += row.duration ?? 0;
  }
  return offsets;
}

export function totalDurationMinutes(rows: ActivityRow[]): number {
  return rows.reduce((sum, r) => sum + (r.duration ?? 0), 0);
}
