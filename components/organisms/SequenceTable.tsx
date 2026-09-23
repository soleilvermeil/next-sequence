"use client";

import { useRef } from "react";
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
  const dragIndex = useRef<number | null>(null);

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
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current === null) return;
                onMove(dragIndex.current, index);
                dragIndex.current = null;
              }}
              className="group border-b border-slate-100 align-top transition-colors hover:bg-slate-50/60"
            >
              <td className="sticky left-0 z-10 bg-white px-1 py-1.5 text-center shadow-[1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50">
                <div className="flex flex-col items-center gap-0.5 text-slate-400">
                  <span className="cursor-grab active:cursor-grabbing" title="Drag to reorder">
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
                    "px-1 py-1 align-top",
                    i === 0
                      ? "sticky left-10 z-10 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50"
                      : "",
                  ].join(" ")}
                >
                  <SequenceCell
                    row={row}
                    column={col}
                    onChange={(key, value) => onChangeField(row.id, key, value)}
                    onClearManualStart={
                      col.key === "startTime"
                        ? () => onClearManualStart(row.id)
                        : undefined
                    }
                  />
                </td>
              ))}
              <td className="sticky right-0 z-10 bg-white px-1.5 py-1.5 shadow-[-1px_0_0_0_rgba(226,232,240,1)] group-hover:bg-slate-50">
                <div className="flex items-center justify-end gap-0.5">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
