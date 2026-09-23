"use client";

import { useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Label } from "@/components/atoms/Label";
import {
  DownloadIcon,
  UploadIcon,
  PlayIcon,
  PlusIcon,
  PdfIcon,
} from "@/components/atoms/icons";
import { listConfigs } from "@/lib/configs";
import type { ConfigId } from "@/lib/types";

export function SequenceToolbar({
  title,
  configId,
  onTitleChange,
  onConfigChange,
  onAddRow,
  onPlay,
  onExport,
  onExportPdf,
  onImportFile,
}: {
  title: string;
  configId: ConfigId;
  onTitleChange: (title: string) => void;
  onConfigChange: (id: ConfigId) => void;
  onAddRow: () => void;
  onPlay: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  onImportFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const configs = listConfigs();

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="lesson-title">Lesson title</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="border-slate-200 bg-white px-3 py-2 text-lg font-semibold tracking-tight text-slate-900"
            placeholder="Lesson title"
          />
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-56">
          <Label htmlFor="table-config">Table configuration</Label>
          <Select
            id="table-config"
            value={configId}
            onChange={(e) => onConfigChange(e.target.value)}
            options={configs.map((c) => ({ value: c.id, label: c.label }))}
            className="border-slate-200 bg-white px-2.5 py-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onPlay}>
          <PlayIcon className="h-3.5 w-3.5" />
          Play sequence
        </Button>
        <Button variant="outline" onClick={onAddRow}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add row
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <Button variant="outline" onClick={onExport}>
          <DownloadIcon className="h-3.5 w-3.5" />
          Export xlsx
        </Button>
        <Button variant="outline" onClick={onExportPdf}>
          <PdfIcon className="h-3.5 w-3.5" />
          Export PDF
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <UploadIcon className="h-3.5 w-3.5" />
          Import xlsx
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
