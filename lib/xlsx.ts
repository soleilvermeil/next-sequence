import * as XLSX from "xlsx";
import type { ActivityRow, ActivityType, FieldKey, SequenceState } from "./types";
import { COLUMN_REGISTRY, fieldKeyFromExportLabel, getColumn } from "./columns";
import { getConfig, inferConfigFromColumns } from "./configs";
import { createRow, getRowFieldValue, recomputeTimes } from "./sequence";
import { addMinutesToTime, formatMinutesAsTime, parseTimeToMinutes } from "./time";

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseDuration(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/,/g, ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseImportedTime(value: unknown): string | null {
  const s = cellToString(value);
  if (!s) return null;
  const mins = parseTimeToMinutes(s);
  return mins !== null ? formatMinutesAsTime(mins) : s;
}

function timesEqual(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const am = parseTimeToMinutes(a);
  const bm = parseTimeToMinutes(b);
  if (am !== null && bm !== null) return am === bm;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Starts that match the previous end are chained (use time from previous activity). */
function markChainedStartTimes(rows: ActivityRow[]): ActivityRow[] {
  let previousEnd: string | null = null;
  return rows.map((row) => {
    const chained =
      Boolean(row.startTime) &&
      Boolean(previousEnd) &&
      timesEqual(row.startTime, previousEnd);
    const next = chained ? { ...row, startTimeManual: false } : row;
    previousEnd =
      row.endTime || addMinutesToTime(row.startTime, row.duration) || previousEnd;
    return next;
  });
}

function parseActivityType(value: unknown): ActivityType {
  const s = cellToString(value);
  const allowed: ActivityType[] = [
    "Student work",
    "Whole-class interaction",
    "Teacher presentation",
  ];
  return (allowed.find((a) => a.toLowerCase() === s.toLowerCase()) ?? "") as ActivityType;
}

function applyImportValue(row: ActivityRow, key: FieldKey, raw: unknown): ActivityRow {
  switch (key) {
    case "activity":
      return { ...row, activity: cellToString(raw) };
    case "duration":
      return { ...row, duration: parseDuration(raw) };
    case "anticipatedDifficulties":
      return { ...row, anticipatedDifficulties: cellToString(raw) };
    case "supportStrategies":
      return { ...row, supportStrategies: cellToString(raw) };
    case "activityType":
      return { ...row, activityType: parseActivityType(raw) };
    case "startTime": {
      const startTime = parseImportedTime(raw);
      return { ...row, startTime, startTimeManual: Boolean(startTime) };
    }
    case "endTime":
      // Stored only to detect chained starts; recomputed after import.
      return { ...row, endTime: parseImportedTime(raw) };
    default:
      return row;
  }
}

export function exportSequenceToXlsx(state: SequenceState): void {
  const config = getConfig(state.configId);
  const columns = config.columns.map(getColumn);
  const headers = columns.map((c) => c.exportLabel);

  const data = state.rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const col of columns) {
      const v = getRowFieldValue(row, col.key);
      record[col.exportLabel] =
        v === null || v === undefined ? "" : (v as string | number);
    }
    return record;
  });

  const sheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sequence");

  const safeTitle = state.title.replace(/[^\w\s-]/g, "").trim() || "lesson-sequence";
  XLSX.writeFile(book, `${safeTitle}.xlsx`);
}

/** Lesson title from an uploaded workbook name (strip path + extension). */
export function titleFromImportFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const withoutExt = base.replace(/\.(xlsx|xls)$/i, "").trim();
  return withoutExt || "Untitled lesson";
}

export function importSequenceFromXlsx(
  buffer: ArrayBuffer,
  current: SequenceState,
  filename?: string,
): { state: SequenceState; warnings: string[] } {
  const book = XLSX.read(buffer, { type: "array" });
  const sheetName = book.SheetNames[0];
  if (!sheetName) {
    throw new Error("The workbook has no sheets.");
  }
  const sheet = book.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error("The sheet is empty.");
  }

  const headers = Object.keys(rows[0] ?? {});
  const mapped: { header: string; key: FieldKey }[] = [];
  const unknown: string[] = [];

  for (const header of headers) {
    const key = fieldKeyFromExportLabel(header);
    if (key) mapped.push({ header, key });
    else if (header.trim()) unknown.push(header);
  }

  if (mapped.length === 0) {
    throw new Error(
      `No matching columns found. Expected names such as: ${Object.values(COLUMN_REGISTRY)
        .map((c) => c.exportLabel)
        .join(", ")}.`,
    );
  }

  const warnings: string[] = [];
  if (unknown.length) {
    warnings.push(`Ignored unmatched columns: ${unknown.join(", ")}.`);
  }

  const importedRows = recomputeTimes(
    markChainedStartTimes(
      rows.map((raw) => {
        let row = createRow();
        for (const { header, key } of mapped) {
          row = applyImportValue(row, key, raw[header]);
        }
        return row;
      }),
    ),
  );

  return {
    state: {
      ...current,
      title: filename ? titleFromImportFilename(filename) : current.title,
      configId: inferConfigFromColumns(mapped.map((m) => m.key)),
      rows: importedRows.length > 0 ? importedRows : [createRow()],
    },
    warnings,
  };
}
