import type { ColumnDef, FieldKey } from "./types";

/**
 * Central column registry. Add new columns here; configs reference keys only.
 */
export const COLUMN_REGISTRY: Record<FieldKey, ColumnDef> = {
  activity: {
    key: "activity",
    label: "Activity",
    exportLabel: "Activity",
    kind: "textarea",
    minWidth: 220,
    compact: true,
  },
  duration: {
    key: "duration",
    label: "Duration",
    exportLabel: "Duration",
    kind: "number",
    minWidth: 88,
    compact: true,
  },
  anticipatedDifficulties: {
    key: "anticipatedDifficulties",
    label: "Anticipated difficulties",
    exportLabel: "Anticipated difficulties",
    kind: "textarea",
    minWidth: 180,
    compact: true,
  },
  supportStrategies: {
    key: "supportStrategies",
    label: "Support strategies",
    exportLabel: "Support strategies",
    kind: "textarea",
    minWidth: 180,
    compact: true,
  },
  activityType: {
    key: "activityType",
    label: "Activity type",
    exportLabel: "Activity type",
    kind: "select",
    minWidth: 160,
    compact: true,
    options: [
      "Student work",
      "Whole-class interaction",
      "Teacher presentation",
    ] as const,
  },
  startTime: {
    key: "startTime",
    label: "Start time",
    exportLabel: "Start time",
    kind: "time",
    minWidth: 110,
    compact: true,
    editableWhenComputed: true,
  },
  endTime: {
    key: "endTime",
    label: "End time",
    exportLabel: "End time",
    kind: "computed",
    minWidth: 96,
    compact: true,
    computed: true,
  },
};

export function getColumn(key: FieldKey): ColumnDef {
  return COLUMN_REGISTRY[key];
}

export function getColumns(keys: FieldKey[]): ColumnDef[] {
  return keys.map(getColumn);
}

/** Resolve export header → field key (case-insensitive, trimmed). */
export function fieldKeyFromExportLabel(header: string): FieldKey | null {
  const normalized = header.trim().toLowerCase();
  for (const col of Object.values(COLUMN_REGISTRY)) {
    if (col.exportLabel.toLowerCase() === normalized) return col.key;
  }
  return null;
}
