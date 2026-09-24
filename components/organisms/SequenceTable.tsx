"use client";

import { useState, type DragEvent } from "react";
import { IconButton } from "@/components/atoms/IconButton";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CommentIcon,
  PlusIcon,
  TrashIcon,
  GripIcon,
} from "@/components/atoms/icons";
import { SequenceCell } from "@/components/molecules/SequenceCell";
import type { ActivityRow, ColumnDef, FieldKey } from "@/lib/types";
import {
  getFieldDiffKind,
  type PendingDisplayRow,
  type PendingRowKind,
} from "@/lib/ai/pending-diff";
import { getRowFieldValue } from "@/lib/sequence";

function rowSurfaceClass(kind: PendingRowKind, dragging: boolean): string {
  if (dragging) return "bg-teal-50/70 opacity-45";
  if (kind === "deleted") return "bg-red-50/50";
  if (kind === "added") return "bg-teal-50/40 hover:bg-teal-50/70";
  if (kind === "modified") return "bg-teal-50/20 hover:bg-teal-50/40";
  return "hover:bg-slate-50/60";
}

function stickyTone(kind: PendingRowKind): string {
  if (kind === "deleted") return "bg-red-50/50 group-hover:bg-red-50/80";
  if (kind === "added") return "bg-teal-50/40 group-hover:bg-teal-50/70";
  if (kind === "modified") return "bg-teal-50/20 group-hover:bg-teal-50/40";
  return "bg-white group-hover:bg-slate-50";
}

export function SequenceTable({
  displayRows,
  columns,
  effectiveRowCount,
  onChangeField,
  onClearManualStart,
  onInsertBelow,
  onDelete,
  onMove,
  onOpenComment,
}: {
  displayRows: PendingDisplayRow[];
  columns: ColumnDef[];
  /** Number of live (non-deleted) rows — used to disable delete. */
  effectiveRowCount: number;
  onChangeField: (rowId: string, key: FieldKey, value: string | number | null) => void;
  onClearManualStart: (rowId: string) => void;
  onInsertBelow: (effectiveIndex: number) => void;
  onDelete: (rowId: string) => void;
  onMove: (fromEffective: number, toEffective: number) => void;
  onOpenComment: (rowId: string) => void;
}) {
  const [draggingEffective, setDraggingEffective] = useState<number | null>(null);
  /** Insertion slot in [0, effectiveRowCount] among live rows. */
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const clearDrag = () => {
    setDraggingEffective(null);
    setDropSlot(null);
  };

  const updateDropSlot = (e: DragEvent, effectiveIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggingEffective === null || effectiveIndex < 0) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const slot = before ? effectiveIndex : effectiveIndex + 1;

    if (slot === draggingEffective || slot === draggingEffective + 1) {
      setDropSlot(null);
      return;
    }
    setDropSlot(slot);
  };

  const handleDrop = () => {
    if (draggingEffective === null || dropSlot === null) {
      clearDrag();
      return;
    }
    let to = dropSlot;
    if (draggingEffective < dropSlot) to = dropSlot - 1;
    if (to !== draggingEffective) onMove(draggingEffective, to);
    clearDrag();
  };

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            <th className="sticky left-0 z-20 w-10 bg-slate-50 px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
              #
            </th>
            {columns.map((col, i) => (
              <th
                key={col.key}
                style={{ minWidth: col.minWidth }}
                className={[
                  "px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500",
                  i === 0
                    ? "sticky left-10 z-20 bg-slate-50 shadow-[1px_0_0_0_rgba(226,232,240,1)]"
                    : "",
                ].join(" ")}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.key === "duration" && (
                    <span className="normal-case tracking-normal text-slate-400">
                      (min)
                    </span>
                  )}
                  {col.computed && (
                    <span className="normal-case tracking-normal font-normal text-slate-400">
                      auto
                    </span>
                  )}
                </span>
              </th>
            ))}
            <th className="sticky right-0 z-20 w-[9.25rem] bg-slate-50 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropSlot(null);
            }
          }}
        >
          {displayRows.map((item) => {
            const { row, kind, effectiveIndex, baseline } = item;
            const isDeleted = kind === "deleted";
            const isLive = effectiveIndex >= 0;
            const showLineBefore =
              isLive && dropSlot === effectiveIndex;
            const showLineAfter =
              isLive &&
              dropSlot === effectiveRowCount &&
              effectiveIndex === effectiveRowCount - 1;
            const hasComment = Boolean(row.aiComment?.trim());
            const numberLabel = isDeleted ? "—" : String(effectiveIndex + 1);

            return (
              <tr
                key={item.key}
                draggable={isLive}
                onDragStart={
                  isLive
                    ? (e) => {
                        setDraggingEffective(effectiveIndex);
                        setDropSlot(null);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(effectiveIndex));
                      }
                    : undefined
                }
                onDragEnd={clearDrag}
                onDragOver={
                  isLive
                    ? (e) => updateDropSlot(e, effectiveIndex)
                    : undefined
                }
                onDrop={
                  isLive
                    ? (e) => {
                        e.preventDefault();
                        handleDrop();
                      }
                    : undefined
                }
                className={[
                  "group border-b border-slate-100 transition-[background-color,opacity]",
                  rowSurfaceClass(
                    kind,
                    draggingEffective === effectiveIndex && isLive,
                  ),
                ].join(" ")}
              >
                <td
                  className={[
                    "sticky left-0 z-10 h-px px-1 py-1 text-center shadow-[1px_0_0_0_rgba(226,232,240,1)]",
                    stickyTone(kind),
                    showLineBefore ? "border-t-4 border-t-teal-800" : "",
                    showLineAfter ? "border-b-4 border-b-teal-800" : "",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-full flex-col items-center justify-center gap-0.5",
                      isDeleted ? "text-red-400" : "text-slate-400",
                    ].join(" ")}
                  >
                    {isLive ? (
                      <span
                        className="cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripIcon className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="h-3.5 w-3.5" aria-hidden />
                    )}
                    <span
                      className={[
                        "text-[11px] tabular-nums",
                        isDeleted ? "text-red-500 line-through" : "text-slate-500",
                      ].join(" ")}
                    >
                      {numberLabel}
                    </span>
                  </div>
                </td>
                {columns.map((col, i) => {
                  const fieldDiff = getFieldDiffKind(
                    kind,
                    baseline,
                    row,
                    col.key,
                  );
                  const previousValue = baseline
                    ? getRowFieldValue(baseline, col.key)
                    : null;
                  return (
                    <td
                      key={col.key}
                      style={{
                        minWidth: col.minWidth,
                        maxWidth: col.minWidth + 120,
                      }}
                      className={[
                        "h-px px-1 py-1",
                        i === 0
                          ? `sticky left-10 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] ${stickyTone(kind)}`
                          : "",
                        showLineBefore ? "border-t-4 border-t-teal-800" : "",
                        showLineAfter ? "border-b-4 border-b-teal-800" : "",
                      ].join(" ")}
                    >
                      <div className="flex h-full flex-col justify-start">
                        <SequenceCell
                          row={row}
                          column={col}
                          readOnly={isDeleted}
                          fieldDiff={fieldDiff}
                          previousValue={previousValue}
                          onChange={(key, value) =>
                            onChangeField(row.id, key, value)
                          }
                          onClearManualStart={
                            col.key === "startTime" && !isDeleted
                              ? () => onClearManualStart(row.id)
                              : undefined
                          }
                        />
                      </div>
                    </td>
                  );
                })}
                <td
                  className={[
                    "sticky right-0 z-10 h-px px-1.5 py-1 shadow-[-1px_0_0_0_rgba(226,232,240,1)]",
                    stickyTone(kind),
                    showLineBefore ? "border-t-4 border-t-teal-800" : "",
                    showLineAfter ? "border-b-4 border-b-teal-800" : "",
                  ].join(" ")}
                >
                  {!isDeleted && (
                    <div className="flex h-full items-start justify-end gap-0.5 pt-0.5">
                      {hasComment && (
                        <IconButton
                          label="View AI comment"
                          className="text-teal-800 hover:bg-teal-50 hover:text-teal-900"
                          onClick={() => onOpenComment(row.id)}
                        >
                          <CommentIcon />
                        </IconButton>
                      )}
                      <IconButton
                        label="Move up"
                        disabled={effectiveIndex <= 0}
                        onClick={() =>
                          onMove(effectiveIndex, effectiveIndex - 1)
                        }
                      >
                        <ChevronUpIcon />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={effectiveIndex >= effectiveRowCount - 1}
                        onClick={() =>
                          onMove(effectiveIndex, effectiveIndex + 1)
                        }
                      >
                        <ChevronDownIcon />
                      </IconButton>
                      <IconButton
                        label="Insert row below"
                        onClick={() => onInsertBelow(effectiveIndex)}
                      >
                        <PlusIcon />
                      </IconButton>
                      <IconButton
                        label="Delete row"
                        tone="danger"
                        disabled={effectiveRowCount <= 1}
                        onClick={() => onDelete(row.id)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Build a trivial unchanged display list when there is no pending proposal. */
export function toUnchangedDisplayRows(rows: ActivityRow[]): PendingDisplayRow[] {
  return rows.map((row, index) => ({
    key: row.id,
    kind: "unchanged" as const,
    effectiveIndex: index,
    row,
    baseline: row,
  }));
}
