/** Canonical field keys — rows store the full bag; configs only select visible columns. */
export type FieldKey =
  | "activity"
  | "duration"
  | "anticipatedDifficulties"
  | "supportStrategies"
  | "activityType"
  | "startTime"
  | "endTime";

export type ActivityType =
  | "Student work"
  | "Whole-class interaction"
  | "Teacher presentation"
  | "";

export type CellValue = string | number | null;

/** Full activity row — always holds every known field for config switching & future cols. */
export interface ActivityRow {
  id: string;
  activity: string;
  duration: number | null;
  anticipatedDifficulties: string;
  supportStrategies: string;
  activityType: ActivityType;
  /** HH:mm — manual override when set; otherwise derived from previous row. */
  startTime: string | null;
  /** HH:mm — always derived from startTime + duration when both available. */
  endTime: string | null;
  /** When true, startTime is user-set and not recomputed from previous row. */
  startTimeManual: boolean;
  /** Extensible bag for future configuration fields without schema churn. */
  extras: Record<string, CellValue>;
}

export type ColumnKind = "text" | "textarea" | "number" | "select" | "time" | "computed";

export interface ColumnDef {
  key: FieldKey;
  label: string;
  /** Header used for xlsx import/export matching. */
  exportLabel: string;
  kind: ColumnKind;
  /** Min width in px for table layout. */
  minWidth: number;
  /** Prefer compact single-line display when possible. */
  compact?: boolean;
  options?: readonly string[];
  /** Column values are derived and not stored as primary edits. */
  computed?: boolean;
  /** Editable even when computed (e.g. start time override). */
  editableWhenComputed?: boolean;
}

export type ConfigId = string;

export interface TableConfig {
  id: ConfigId;
  label: string;
  description: string;
  columns: FieldKey[];
  /** Whether play mode can sync to wall-clock schedule. */
  hasTiming: boolean;
}

export interface SequenceState {
  title: string;
  configId: ConfigId;
  rows: ActivityRow[];
}

export interface ConfigSwitchImpact {
  fromId: ConfigId;
  toId: ConfigId;
  droppedColumns: FieldKey[];
  droppedWithData: { key: FieldKey; label: string; nonEmptyCount: number }[];
}

export type PlayModeOption = "sync" | "now";

export interface PlayState {
  active: boolean;
  mode: PlayModeOption;
  /** Index on the user's custom timeline (equals official while synced). */
  currentIndex: number;
  /**
   * Origin of the user's custom timeline.
   * Shifts on pause-resume and manual next/previous; reset on sync.
   */
  timelineOriginMs: number;
  /**
   * Origin of the official schedule — fixed for the whole play session.
   * Sync mode: first activity wall-clock start (or now if unset).
   * Now mode: moment play began.
   */
  baseOriginMs: number;
  /**
   * True after pause or next/previous — UI splits into official | custom.
   * Cleared by "Sync to schedule".
   */
  offTimeline: boolean;
}
