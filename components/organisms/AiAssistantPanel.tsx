"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Spinner } from "@/components/atoms/Spinner";
import {
  CloseIcon,
  SendIcon,
  SparklesIcon,
} from "@/components/atoms/icons";
import type { ChatMessage } from "@/lib/types";

export function AiAssistantPanel({
  open,
  messages,
  busy,
  error,
  hasPending,
  onClose,
  onSend,
  onClearError,
  onKeepAll,
  onUndoAll,
}: {
  open: boolean;
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  hasPending: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onClearError: () => void;
  onKeepAll: () => void;
  onUndoAll: () => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, busy]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    onSend(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <aside
      className="fixed bottom-4 right-4 z-40 flex h-[min(28rem,calc(100vh-5rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
      aria-label="AI assistant"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-800 text-white">
            <SparklesIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">AI assistant</p>
            <p className="truncate text-[11px] text-slate-500">
              Can read and edit your sequence
            </p>
          </div>
        </div>
        <IconButton label="Close assistant" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !busy && (
          <div className="rounded-md bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            Ask for a review, timing tweaks, or new activities. I can comment on
            specific rows and update the table with tools.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              "max-w-[95%] rounded-lg px-2.5 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-teal-800 text-white"
                : "mr-auto border border-slate-100 bg-slate-50 text-slate-800",
            ].join(" ")}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {busy && (
          <div className="mr-auto flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
            <Spinner className="h-3.5 w-3.5" />
            Working…
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
          <div className="flex items-start justify-between gap-2">
            <p className="leading-relaxed">{error}</p>
            <button
              type="button"
              className="shrink-0 text-red-700 underline"
              onClick={onClearError}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {hasPending && (
        <div className="flex gap-2 border-t border-teal-100 bg-teal-50/60 px-2.5 py-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={onKeepAll}
          >
            Keep all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={onUndoAll}
          >
            Undo all
          </Button>
        </div>
      )}

      <form
        onSubmit={submit}
        className="border-t border-slate-100 bg-white p-2.5"
      >
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={busy}
            placeholder="Ask about this lesson…"
            className="min-h-[2.5rem] flex-1 resize-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={busy || !draft.trim()}
            className="h-9 w-9 shrink-0 !px-0"
            aria-label="Send"
          >
            <SendIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Enter to send · Shift+Enter for newline
        </p>
      </form>
    </aside>
  );
}
