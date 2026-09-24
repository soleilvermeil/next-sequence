"use client";

import { useCallback, useMemo, useState } from "react";
import { SequenceToolbar } from "@/components/organisms/SequenceToolbar";
import {
  SequenceTable,
  toUnchangedDisplayRows,
} from "@/components/organisms/SequenceTable";
import { PlayMode, createInitialPlayState } from "@/components/organisms/PlayMode";
import { AiAssistantPanel } from "@/components/organisms/AiAssistantPanel";
import { ConfigSwitchModal } from "@/components/molecules/ConfigSwitchModal";
import { PlayStartModal } from "@/components/molecules/PlayStartModal";
import { RowCommentModal } from "@/components/molecules/RowCommentModal";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { getConfig, getConfigColumnDefs } from "@/lib/configs";
import {
  analyzeConfigSwitch,
  clearManualStart,
  clearRowComment,
  createEmptySequence,
  deleteRow,
  insertRowAt,
  moveRow,
  recomputeTimes,
  totalDurationMinutes,
  updateRowField,
} from "@/lib/sequence";
import {
  buildPendingDisplayRows,
  sequencesEqual,
} from "@/lib/ai/pending-diff";
import { formatDurationShort } from "@/lib/time";
import { exportSequenceToXlsx, importSequenceFromXlsx } from "@/lib/xlsx";
import { exportSequenceToPdf } from "@/lib/pdf";
import type {
  ChatMessage,
  ConfigId,
  ConfigSwitchImpact,
  FieldKey,
  PlayModeOption,
  PlayState,
  SequenceState,
} from "@/lib/types";

function newChatId() {
  return crypto.randomUUID();
}

export function LessonSequenceApp() {
  const [accepted, setAccepted] = useState<SequenceState>(() =>
    recomputeTimesState(createEmptySequence("simple")),
  );
  const [pending, setPending] = useState<SequenceState | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<ConfigSwitchImpact | null>(
    null,
  );
  const [playOpen, setPlayOpen] = useState(false);
  const [play, setPlay] = useState<PlayState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [commentRowId, setCommentRowId] = useState<string | null>(null);

  const effective = pending ?? accepted;
  const hasPending = pending !== null;

  const config = getConfig(effective.configId);
  const columns = useMemo(
    () => getConfigColumnDefs(effective.configId),
    [effective.configId],
  );

  const displayRows = useMemo(() => {
    if (!pending) return toUnchangedDisplayRows(accepted.rows);
    return buildPendingDisplayRows(accepted, pending);
  }, [accepted, pending]);

  const commentRow = commentRowId
    ? effective.rows.find((r) => r.id === commentRowId)
    : undefined;
  const commentIndex = commentRow
    ? effective.rows.findIndex((r) => r.id === commentRow.id)
    : -1;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  /** Mutate the live sequence (pending if reviewing AI changes, else accepted). */
  const updateLive = useCallback(
    (updater: (s: SequenceState) => SequenceState) => {
      if (pending) {
        const next = recomputeTimesState(updater(pending));
        if (sequencesEqual(next, accepted)) setPending(null);
        else setPending(next);
      } else {
        setAccepted((s) => recomputeTimesState(updater(s)));
      }
    },
    [pending, accepted],
  );

  const applyConfig = (id: ConfigId) => {
    updateLive((s) => ({ ...s, configId: id }));
    setPendingSwitch(null);
  };

  const requestConfigChange = (id: ConfigId) => {
    if (id === effective.configId) return;
    const impact = analyzeConfigSwitch(effective.configId, id, effective.rows);
    if (impact.droppedWithData.length > 0) {
      setPendingSwitch(impact);
    } else {
      applyConfig(id);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { state: next, warnings } = importSequenceFromXlsx(buffer, effective);
      setAccepted(next);
      setPending(null);
      if (warnings.length) showToast(warnings.join(" "));
      else showToast("Sequence imported.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const startPlay = (mode: PlayModeOption) => {
    setPlay(createInitialPlayState(effective.rows, mode));
    setPlayOpen(false);
  };

  const keepAllPending = () => {
    if (!pending) return;
    setAccepted(pending);
    setPending(null);
  };

  const undoAllPending = () => {
    setPending(null);
  };

  const sendChat = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = {
        id: newChatId(),
        role: "user",
        content: text,
      };
      const nextMessages = [...chatMessages, userMessage];
      setChatMessages(nextMessages);
      setChatBusy(true);
      setChatError(null);
      setAiOpen(true);

      const sequenceForAi = pending ?? accepted;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            sequence: sequenceForAi,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          sequence?: SequenceState;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        if (data.sequence) {
          const next = recomputeTimesState(data.sequence);
          // Diff always against the last accepted baseline.
          if (sequencesEqual(next, accepted)) {
            setPending(null);
          } else {
            setPending(next);
          }
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: newChatId(),
            role: "assistant",
            content: data.reply?.trim() || "Done.",
          },
        ]);
      } catch (err) {
        setChatError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      } finally {
        setChatBusy(false);
      }
    },
    [chatMessages, accepted, pending],
  );

  const askSolveComment = () => {
    if (!commentRow?.aiComment) return;
    const label =
      commentRow.activity.trim() ||
      `Activity ${commentIndex >= 0 ? commentIndex + 1 : ""}`.trim();
    const prompt = [
      `Please address this AI comment on row id ${commentRow.id} (${label}):`,
      `"${commentRow.aiComment}"`,
      "",
      "Use your tools to update the sequence as needed. When the issue is resolved, clear the row comment (or replace it if something still needs attention).",
    ].join("\n");
    setCommentRowId(null);
    void sendChat(prompt);
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
              {formatDurationShort(totalDurationMinutes(effective.rows))}
            </Badge>
            {hasPending && <Badge tone="accent">AI changes pending</Badge>}
          </div>
        </div>
      </header>

      <SequenceToolbar
        title={effective.title}
        configId={effective.configId}
        titlePending={hasPending && pending!.title !== accepted.title}
        previousTitle={accepted.title}
        onTitleChange={(title) => updateLive((s) => ({ ...s, title }))}
        onConfigChange={requestConfigChange}
        onAddRow={() =>
          updateLive((s) => ({
            ...s,
            rows: insertRowAt(s.rows, s.rows.length),
          }))
        }
        onPlay={() => setPlayOpen(true)}
        onOpenAi={() => setAiOpen(true)}
        onExport={() => exportSequenceToXlsx(effective)}
        onExportPdf={() => exportSequenceToPdf(effective)}
        onImportFile={handleImport}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          {config.description} Sticky activity column and actions stay visible while
          scrolling. Drag the grip handle or use arrows to reorder. Start times
          chain from the previous end unless you set them manually.
          {hasPending && (
            <>
              {" "}
              <span className="text-teal-800">
                Teal marks AI additions/edits; red strikethrough marks removals.
                Keep or undo from the assistant panel.
              </span>
            </>
          )}
        </p>
        <SequenceTable
          displayRows={displayRows}
          columns={columns}
          effectiveRowCount={effective.rows.length}
          onChangeField={(rowId, key: FieldKey, value) =>
            updateLive((s) => ({
              ...s,
              rows: updateRowField(s.rows, rowId, key, value),
            }))
          }
          onClearManualStart={(rowId) =>
            updateLive((s) => ({
              ...s,
              rows: clearManualStart(s.rows, rowId),
            }))
          }
          onInsertBelow={(index) =>
            updateLive((s) => ({
              ...s,
              rows: insertRowAt(s.rows, index + 1),
            }))
          }
          onDelete={(rowId) =>
            updateLive((s) => ({
              ...s,
              rows: deleteRow(s.rows, rowId),
            }))
          }
          onMove={(from, to) =>
            updateLive((s) => ({
              ...s,
              rows: moveRow(s.rows, from, to),
            }))
          }
          onOpenComment={(rowId) => setCommentRowId(rowId)}
        />
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateLive((s) => ({
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

      <RowCommentModal
        open={Boolean(commentRow?.aiComment)}
        rowLabel={
          commentRow
            ? `Row ${commentIndex + 1}${
                commentRow.activity.trim()
                  ? ` — ${commentRow.activity.trim()}`
                  : ""
              }`
            : "Row"
        }
        comment={commentRow?.aiComment ?? ""}
        onClose={() => setCommentRowId(null)}
        onDelete={() => {
          if (!commentRowId) return;
          updateLive((s) => ({
            ...s,
            rows: clearRowComment(s.rows, commentRowId),
          }));
          setCommentRowId(null);
        }}
        onAskSolve={askSolveComment}
      />

      <AiAssistantPanel
        open={aiOpen}
        messages={chatMessages}
        busy={chatBusy}
        error={chatError}
        hasPending={hasPending}
        onClose={() => setAiOpen(false)}
        onSend={(text) => void sendChat(text)}
        onClearError={() => setChatError(null)}
        onKeepAll={keepAllPending}
        onUndoAll={undoAllPending}
      />

      {play?.active && (
        <PlayMode
          title={effective.title}
          rows={effective.rows}
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
