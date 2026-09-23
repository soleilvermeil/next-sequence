"use client";

import { useState, type DragEvent } from "react";
import { IconButton } from "@/components/atoms/IconButton";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
  GripIcon,
} from "@/components/atoms/icons";
import { SequenceCell } from "@/components/molecules/SequenceCell";
import type { ActivityRow, ColumnDef, FieldKey } from "@/lib/types";

export function SequenceTable({
  rows,
  columns,
  onChangeField,
  onClearManualStart,
  onInsertBelow,
  onDelete,
  onMove,
}: {
  rows: ActivityRow[];
  columns: ColumnDef[];
  onChangeField: (rowId: string, key: FieldKey, value: string | number | null) => void;
  onClearManualStart: (rowId: string) => void;
  onInsertBelow: (index: number) => void;
  onDelete: (rowId: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  /** Insertion slot in [0, rows.length] — line appears before this index. */
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const clearDrag = () => {
    setDraggingIndex(null);
    setDropSlot(null);
  };

  const updateDropSlot = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggingIndex === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const slot = before ? index : index + 1;

    // Ignore no-op slots (before/after the dragged row itself).
    if (slot === draggingIndex || slot === draggingIndex + 1) {
      setDropSlot(null);
      return;
    }
    setDropSlot(slot);
  };

  const handleDrop = () => {
    if (draggingIndex === null || dropSlot === null) {
      clearDrag();
      return;
    }
    let to = dropSlot;
    if (draggingIndex < dropSlot) to = dropSlot - 1;
    if (to !== draggingIndex) onMove(draggingIndex, to);
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
            <th className="sticky right-0 z-20 w-[7.5rem] bg-slate-50 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[-1px_0_0_0_rgba(226,232,240,1)]">
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
          {rows.map((row, index) => {
            const showLineBefore = dropSlot === index;
            const showLineAfter =
              dropSlot === rows.length && index === rows.length - 1;

            return (
              <tr
                key={row.id}
                draggable
                onDragStart={(e) => {
                  setDraggingIndex(index);
                  setDropSlot(null);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={clearDrag}
                onDragOver={(e) => updateDropSlot(e, index)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop();
                }}
                className={[
                  "group border-b border-slate-100 transition-[background-color,opacity]",
                  draggingIndex === index
                    ? "bg-teal-50/70 opacity-45"
                    : "hover:bg-slate-50/60",
                ].join(" ")}
              >
                <td
                  className={[
                    "sticky left-0 z-10 h-px bg-white px-1 py-1 text-center shadow-[1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50",
                    showLineBefore ? "border-t-4 border-t-teal-800" : "",
                    showLineAfter ? "border-b-4 border-b-teal-800" : "",
                  ].join(" ")}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-0.5 text-slate-400">
                    <span
                      className="cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {index + 1}
                    </span>
                  </div>
                </td>
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minWidth, maxWidth: col.minWidth + 120 }}
                    className={[
                      "h-px px-1 py-1",
                      i === 0
                        ? "sticky left-10 z-10 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50"
                        : "",
                      showLineBefore ? "border-t-4 border-t-teal-800" : "",
                      showLineAfter ? "border-b-4 border-b-teal-800" : "",
                    ].join(" ")}
                  >
                    <div className="flex h-full flex-col justify-start">
                      <SequenceCell
                        row={row}
                        column={col}
                        onChange={(key, value) =>
                          onChangeField(row.id, key, value)
                        }
                        onClearManualStart={
                          col.key === "startTime"
                            ? () => onClearManualStart(row.id)
                            : undefined
                        }
                      />
                    </div>
                  </td>
                ))}
                <td
                  className={[
                    "sticky right-0 z-10 h-px bg-white px-1.5 py-1 shadow-[-1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50",
                    showLineBefore ? "border-t-4 border-t-teal-800" : "",
                    showLineAfter ? "border-b-4 border-b-teal-800" : "",
                  ].join(" ")}
                >
                  <div className="flex h-full items-start justify-end gap-0.5 pt-0.5">
                    <IconButton
                      label="Move up"
                      disabled={index === 0}
                      onClick={() => onMove(index, index - 1)}
                    >
                      <ChevronUpIcon />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={index === rows.length - 1}
                      onClick={() => onMove(index, index + 1)}
                    >
                      <ChevronDownIcon />
                    </IconButton>
                    <IconButton
                      label="Insert row below"
                      onClick={() => onInsertBelow(index)}
                    >
                      <PlusIcon />
                    </IconButton>
                    <IconButton
                      label="Delete row"
                      tone="danger"
                      disabled={rows.length <= 1}
                      onClick={() => onDelete(row.id)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
