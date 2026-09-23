"use client";

import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Select } from "@/components/atoms/Select";
import { IconButton } from "@/components/atoms/IconButton";
import { SyncIcon } from "@/components/atoms/icons";
import type { ActivityRow, ColumnDef, FieldKey } from "@/lib/types";
import { getRowFieldValue } from "@/lib/sequence";

export function SequenceCell({
  row,
  column,
  onChange,
  onClearManualStart,
}: {
  row: ActivityRow;
  column: ColumnDef;
  onChange: (key: FieldKey, value: string | number | null) => void;
  onClearManualStart?: () => void;
}) {
  const value = getRowFieldValue(row, column.key);

  if (column.key === "endTime" || column.kind === "computed") {
    return (
      <Input
        type="time"
        compact
        readOnly
        tabIndex={-1}
        value={typeof value === "string" && value ? value : ""}
        className="tabular-nums text-slate-600 read-only:focus:border-transparent read-only:focus:ring-0"
        aria-label={column.label}
      />
    );
  }

  if (column.key === "startTime") {
    return (
      <div className="flex items-center gap-0.5">
        <Input
          type="time"
          compact
          value={typeof value === "string" && value ? value : ""}
          onChange={(e) => onChange("startTime", e.target.value || null)}
          className="min-w-0 flex-1 tabular-nums"
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
    );
  }

  if (column.kind === "number") {
    return (
      <Input
        type="number"
        min={0}
        step={1}
        compact
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) =>
          onChange(column.key, e.target.value === "" ? null : Number(e.target.value))
        }
        className="tabular-nums"
        aria-label={column.label}
        placeholder="min"
      />
    );
  }

  if (column.kind === "select" && column.options) {
    return (
      <Select
        compact
        placeholder="—"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(column.key, e.target.value)}
        options={column.options.map((o) => ({ value: o, label: o }))}
        aria-label={column.label}
      />
    );
  }

  if (column.kind === "textarea") {
    return (
      <Textarea
        compact
        maxRows={8}
        className="min-h-0 flex-1"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(column.key, e.target.value)}
        aria-label={column.label}
        placeholder={column.key === "activity" ? "Describe the activity…" : undefined}
      />
    );
  }

  return (
    <Input
      compact
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(column.key, e.target.value)}
      aria-label={column.label}
    />
  );
}
