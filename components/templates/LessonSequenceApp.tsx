"use client";

import { useCallback, useMemo, useState } from "react";
import { SequenceToolbar } from "@/components/organisms/SequenceToolbar";
import { SequenceTable } from "@/components/organisms/SequenceTable";
import { PlayMode, createInitialPlayState } from "@/components/organisms/PlayMode";
import { ConfigSwitchModal } from "@/components/molecules/ConfigSwitchModal";
import { PlayStartModal } from "@/components/molecules/PlayStartModal";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { getConfig, getConfigColumnDefs } from "@/lib/configs";
import {
  analyzeConfigSwitch,
  clearManualStart,
  createEmptySequence,
  deleteRow,
  insertRowAt,
  moveRow,
  recomputeTimes,
  totalDurationMinutes,
  updateRowField,
} from "@/lib/sequence";
import { formatDurationShort } from "@/lib/time";
import { exportSequenceToXlsx, importSequenceFromXlsx } from "@/lib/xlsx";
import { exportSequenceToPdf } from "@/lib/pdf";
import type {
  ConfigId,
  ConfigSwitchImpact,
  FieldKey,
  PlayModeOption,
  PlayState,
  SequenceState,
} from "@/lib/types";

export function LessonSequenceApp() {
  const [state, setState] = useState<SequenceState>(() =>
    recomputeTimesState(createEmptySequence("simple")),
  );
  const [pendingSwitch, setPendingSwitch] = useState<ConfigSwitchImpact | null>(
    null,
  );
  const [playOpen, setPlayOpen] = useState(false);
  const [play, setPlay] = useState<PlayState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const config = getConfig(state.configId);
  const columns = useMemo(
    () => getConfigColumnDefs(state.configId),
    [state.configId],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const applyConfig = (id: ConfigId) => {
    setState((s) => ({ ...s, configId: id }));
    setPendingSwitch(null);
  };

  const requestConfigChange = (id: ConfigId) => {
    if (id === state.configId) return;
    const impact = analyzeConfigSwitch(state.configId, id, state.rows);
    if (impact.droppedWithData.length > 0) {
      setPendingSwitch(impact);
    } else {
      applyConfig(id);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { state: next, warnings } = importSequenceFromXlsx(buffer, state);
      setState(next);
      if (warnings.length) showToast(warnings.join(" "));
      else showToast("Sequence imported.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const startPlay = (mode: PlayModeOption) => {
    setPlay(createInitialPlayState(state.rows, mode));
    setPlayOpen(false);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafb_0%,#f1f5f7_100%)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-slate-900 sm:text-3xl">
              Sequence
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Plan lesson activities in a configurable table, then play them as a
              timed teleprompter.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="neutral">{config.label}</Badge>
            <Badge tone="accent">
              {formatDurationShort(totalDurationMinutes(state.rows))}
            </Badge>
          </div>
        </div>
      </header>

      <SequenceToolbar
        title={state.title}
        configId={state.configId}
        onTitleChange={(title) => setState((s) => ({ ...s, title }))}
        onConfigChange={requestConfigChange}
        onAddRow={() =>
          setState((s) => ({
            ...s,
            rows: insertRowAt(s.rows, s.rows.length),
          }))
        }
        onPlay={() => setPlayOpen(true)}
        onExport={() => exportSequenceToXlsx(state)}
        onExportPdf={() => exportSequenceToPdf(state)}
        onImportFile={handleImport}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          {config.description} Sticky activity column and actions stay visible while
          scrolling. Drag the grip handle or use arrows to reorder. Start times
          chain from the previous end unless you set them manually.
        </p>
        <SequenceTable
          rows={state.rows}
          columns={columns}
          onChangeField={(rowId, key: FieldKey, value) =>
            setState((s) => ({
              ...s,
              rows: updateRowField(s.rows, rowId, key, value),
            }))
          }
          onClearManualStart={(rowId) =>
            setState((s) => ({
              ...s,
              rows: clearManualStart(s.rows, rowId),
            }))
          }
          onInsertBelow={(index) =>
            setState((s) => ({
              ...s,
              rows: insertRowAt(s.rows, index + 1),
            }))
          }
          onDelete={(rowId) =>
            setState((s) => ({
              ...s,
              rows: deleteRow(s.rows, rowId),
            }))
          }
          onMove={(from, to) =>
            setState((s) => ({
              ...s,
              rows: moveRow(s.rows, from, to),
            }))
          }
        />
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setState((s) => ({
                ...s,
                rows: insertRowAt(s.rows, s.rows.length),
              }))
            }
          >
            + Add activity at end
          </Button>
        </div>
      </main>

      <ConfigSwitchModal
        impact={pendingSwitch}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => pendingSwitch && applyConfig(pendingSwitch.toId)}
      />

      <PlayStartModal
        open={playOpen}
        hasTiming={config.hasTiming}
        onClose={() => setPlayOpen(false)}
        onStart={startPlay}
      />

      {play?.active && (
        <PlayMode
          title={state.title}
          rows={state.rows}
          play={play}
          onPlayChange={setPlay}
          onExit={() => setPlay(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function recomputeTimesState(state: SequenceState): SequenceState {
  return { ...state, rows: recomputeTimes(state.rows) };
}
