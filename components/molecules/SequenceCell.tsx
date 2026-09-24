"use client";

import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Select } from "@/components/atoms/Select";
import { IconButton } from "@/components/atoms/IconButton";
import { SyncIcon } from "@/components/atoms/icons";
import type { ActivityRow, ColumnDef, FieldKey } from "@/lib/types";
import { getRowFieldValue } from "@/lib/sequence";
import {
  formatDiffValue,
  type FieldDiffKind,
} from "@/lib/ai/pending-diff";

const addedControl =
  "border-teal-600/35 bg-teal-50/60 text-teal-900 focus:border-teal-700/50 focus:ring-teal-700/20";
const removedText = "text-sm text-red-600 line-through decoration-red-500/80";

export function SequenceCell({
  row,
  column,
  onChange,
  onClearManualStart,
  fieldDiff = "same",
  previousValue = null,
  readOnly = false,
}: {
  row: ActivityRow;
  column: ColumnDef;
  onChange: (key: FieldKey, value: string | number | null) => void;
  onClearManualStart?: () => void;
  fieldDiff?: FieldDiffKind;
  previousValue?: string | number | null;
  readOnly?: boolean;
}) {
  const value = getRowFieldValue(row, column.key);

  if (readOnly) {
    return (
      <div className="px-1.5 py-1">
        <p className={removedText}>
          {formatDiffValue(previousValue ?? value)}
        </p>
      </div>
    );
  }

  const previousBlock =
    (fieldDiff === "changed" || fieldDiff === "removed") &&
    previousValue !== undefined &&
    formatDiffValue(previousValue) !== "—" ? (
      <p className={`px-1.5 pt-1 ${removedText}`}>
        {formatDiffValue(previousValue)}
      </p>
    ) : null;

  const controlTone =
    fieldDiff === "added" || fieldDiff === "changed" || fieldDiff === "removed"
      ? addedControl
      : "";

  if (column.key === "endTime" || column.kind === "computed") {
    return (
      <div>
        {previousBlock}
        <Input
          type="time"
          compact
          readOnly
          tabIndex={-1}
          value={typeof value === "string" && value ? value : ""}
          className={[
            "tabular-nums text-slate-600 read-only:focus:border-transparent read-only:focus:ring-0",
            controlTone,
          ].join(" ")}
          aria-label={column.label}
        />
      </div>
    );
  }

  if (column.key === "startTime") {
    return (
      <div>
        {previousBlock}
        <div className="flex items-center gap-0.5">
          <Input
            type="time"
            compact
            value={typeof value === "string" && value ? value : ""}
            onChange={(e) => onChange("startTime", e.target.value || null)}
            className={["min-w-0 flex-1 tabular-nums", controlTone].join(" ")}
            aria-label="Start time"
          />
          {row.startTimeManual && onClearManualStart && (
            <IconButton
              label="Use time from previous activity"
              tone="muted"
              onClick={onClearManualStart}
            >
              <SyncIcon className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
      </div>
    );
  }

  if (column.kind === "number") {
    return (
      <div>
        {previousBlock}
        <Input
          type="number"
          min={0}
          step={1}
          compact
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(column.key, e.target.value === "" ? null : Number(e.target.value))
          }
          className={["tabular-nums", controlTone].join(" ")}
          aria-label={column.label}
          placeholder="min"
        />
      </div>
    );
  }

  if (column.kind === "select" && column.options) {
    return (
      <div>
        {previousBlock}
        <Select
          compact
          placeholder="—"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(column.key, e.target.value)}
          options={column.options.map((o) => ({ value: o, label: o }))}
          aria-label={column.label}
          className={controlTone}
        />
      </div>
    );
  }

  if (column.kind === "textarea") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {previousBlock}
        <Textarea
          compact
          maxRows={8}
          className={["min-h-0 flex-1", controlTone].join(" ")}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(column.key, e.target.value)}
          aria-label={column.label}
          placeholder={column.key === "activity" ? "Describe the activity…" : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      {previousBlock}
      <Input
        compact
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(column.key, e.target.value)}
        aria-label={column.label}
        className={controlTone}
      />
    </div>
  );
}
