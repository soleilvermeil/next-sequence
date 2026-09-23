"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { IconButton } from "@/components/atoms/IconButton";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SyncIcon,
  ClockIcon,
} from "@/components/atoms/icons";
import type { ActivityRow, PlayModeOption, PlayState } from "@/lib/types";
import {
  formatClock,
  formatDurationShort,
  timeTodayToEpoch,
} from "@/lib/time";
import { getCumulativeOffsets, totalDurationMinutes } from "@/lib/sequence";

function buildPlayState(
  rows: ActivityRow[],
  mode: PlayModeOption,
): Omit<PlayState, "active"> & { active: true } {
  const now = Date.now();
  const firstStart = timeTodayToEpoch(rows[0]?.startTime ?? null);
  const baseOriginMs =
    mode === "sync" && firstStart !== null ? firstStart : now;

  let currentIndex = 0;
  if (mode === "sync" && firstStart !== null) {
    const offsets = getCumulativeOffsets(rows);
    const elapsedMin = (now - baseOriginMs) / 60000;
    for (let i = 0; i < rows.length; i++) {
      const start = offsets[i];
      const end = start + (rows[i].duration ?? 0);
      if (elapsedMin >= start && elapsedMin < end) {
        currentIndex = i;
        break;
      }
      if (elapsedMin >= end) currentIndex = Math.min(i + 1, rows.length - 1);
    }
  }

  return {
    active: true,
    mode,
    currentIndex,
    timelineOriginMs: baseOriginMs,
    baseOriginMs,
    offTimeline: false,
  };
}

function activityAbsoluteTimes(
  rows: ActivityRow[],
  originMs: number,
): { startMs: number; endMs: number }[] {
  const offsets = getCumulativeOffsets(rows);
  return rows.map((row, i) => {
    const startMs = originMs + offsets[i] * 60000;
    const endMs = startMs + (row.duration ?? 0) * 60000;
    return { startMs, endMs };
  });
}

export function createInitialPlayState(
  rows: ActivityRow[],
  mode: PlayModeOption,
): PlayState {
  return buildPlayState(rows, mode);
}

export function PlayMode({
  title,
  rows,
  play,
  onPlayChange,
  onExit,
}: {
  title: string;
  rows: ActivityRow[];
  play: PlayState;
  onPlayChange: (next: PlayState) => void;
  onExit: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [paused]);

  const baseTimes = useMemo(
    () => activityAbsoluteTimes(rows, play.baseOriginMs),
    [rows, play.baseOriginMs],
  );
  const liveTimes = useMemo(
    () => activityAbsoluteTimes(rows, play.timelineOriginMs),
    [rows, play.timelineOriginMs],
  );

  /** Auto-advance when on the automatic timeline. */
  useEffect(() => {
    if (!play.active || play.offTimeline || paused) return;
    const times = liveTimes;
    let idx = 0;
    for (let i = 0; i < times.length; i++) {
      if (now >= times[i].startMs) idx = i;
    }
    // If past last activity end, stay on last
    const last = times[times.length - 1];
    if (last && now >= last.endMs) idx = times.length - 1;

    if (idx !== play.currentIndex) {
      onPlayChange({ ...play, currentIndex: idx });
    }
  }, [now, liveTimes, play, onPlayChange, paused]);

  const current = rows[play.currentIndex];
  const currentLive = liveTimes[play.currentIndex];
  const currentBase = baseTimes[play.currentIndex];
  const progress =
    currentLive && current?.duration
      ? Math.min(
          1,
          Math.max(0, (now - currentLive.startMs) / (current.duration * 60000)),
        )
      : 0;

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    const targetStart = liveTimes[clamped]?.startMs;
    if (targetStart === undefined) return;

    // Shift timeline so this activity starts "now" relative to its planned offset — keep durations.
    // Off-timeline: jump index only; keep origin so dual clocks make sense.
    // Actually user asked: manually switch activities OR sync back.
    // When off timeline, show both base and user timeline.
    // Manual switch = user is on a different timeline.
    const offsets = getCumulativeOffsets(rows);
    const newOrigin = Date.now() - offsets[clamped] * 60000;

    onPlayChange({
      ...play,
      currentIndex: clamped,
      timelineOriginMs: newOrigin,
      offTimeline: true,
    });
    setNow(Date.now());
    setPaused(false);
    setPausedAt(null);
  };

  const syncBack = () => {
    const next = buildPlayState(rows, play.mode);
    onPlayChange({
      ...next,
      offTimeline: false,
    });
    setNow(Date.now());
    setPaused(false);
    setPausedAt(null);
  };

  const togglePause = () => {
    if (!paused) {
      setPaused(true);
      setPausedAt(Date.now());
    } else {
      if (pausedAt !== null) {
        const delta = Date.now() - pausedAt;
        onPlayChange({
          ...play,
          timelineOriginMs: play.timelineOriginMs + delta,
          baseOriginMs: play.baseOriginMs + delta,
        });
      }
      setPaused(false);
      setPausedAt(null);
      setNow(Date.now());
    }
  };

  const remainingMs = currentLive
    ? Math.max(0, currentLive.endMs - now)
    : 0;
  const remainingMin = Math.ceil(remainingMs / 60000);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-white">
            Sequence
          </p>
          <p className="truncate text-sm text-slate-400">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {play.offTimeline && (
            <Badge tone="warn">Off schedule</Badge>
          )}
          <Badge tone="accent">
            {play.mode === "sync" ? "Synced start" : "Started now"}
          </Badge>
          <IconButton
            label="Exit play mode"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={onExit}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
          onClick={() => goTo(play.currentIndex - 1)}
          disabled={play.currentIndex <= 0}
        >
          <SkipBackIcon className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
          onClick={togglePause}
        >
          {paused ? (
            <PlayIcon className="h-3.5 w-3.5" />
          ) : (
            <PauseIcon className="h-3.5 w-3.5" />
          )}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
          onClick={() => goTo(play.currentIndex + 1)}
          disabled={play.currentIndex >= rows.length - 1}
        >
          Next
          <SkipForwardIcon className="h-3.5 w-3.5" />
        </Button>
        {play.offTimeline && (
          <Button
            variant="primary"
            size="sm"
            onClick={syncBack}
          >
            <SyncIcon className="h-3.5 w-3.5" />
            Sync to schedule
          </Button>
        )}
      </div>

      {play.offTimeline && currentBase && currentLive && (
        <div className="grid gap-2 border-b border-white/10 bg-amber-950/30 px-4 py-3 sm:grid-cols-2 sm:px-6">
          <div className="flex items-start gap-2 text-sm">
            <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-200/70">
                Base schedule
              </p>
              <p className="tabular-nums text-amber-50">
                {formatClock(currentBase.startMs)} – {formatClock(currentBase.endMs)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-200/80" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-teal-200/70">
                Current timeline
              </p>
              <p className="tabular-nums text-teal-50">
                {formatClock(currentLive.startMs)} – {formatClock(currentLive.endMs)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 overflow-y-auto px-4 py-8 sm:px-8"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 8%, black 88%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 8%, black 88%, transparent)",
          }}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {rows.map((row, index) => {
              const isCurrent = index === play.currentIndex;
              const isPast = index < play.currentIndex;
              const live = liveTimes[index];
              const base = baseTimes[index];

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={[
                    "rounded-lg border px-4 py-4 text-left transition-all duration-500",
                    isCurrent
                      ? "scale-[1.02] border-teal-400/50 bg-teal-900/40 shadow-lg shadow-teal-950/40"
                      : isPast
                        ? "border-transparent bg-white/[0.03] opacity-45"
                        : "border-white/10 bg-white/[0.04] opacity-70 hover:opacity-90",
                  ].join(" ")}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-slate-400">
                      {index + 1}/{rows.length}
                    </span>
                    {row.activityType && (
                      <span className="text-xs text-slate-400">{row.activityType}</span>
                    )}
                    <span className="text-xs tabular-nums text-slate-500">
                      {formatDurationShort(row.duration)}
                    </span>
                    {live && (
                      <span className="text-xs tabular-nums text-slate-500">
                        {formatClock(live.startMs)}
                        {play.offTimeline && base
                          ? ` · base ${formatClock(base.startMs)}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <p
                    className={[
                      "leading-snug text-balance",
                      isCurrent
                        ? "text-2xl font-medium tracking-tight text-white sm:text-3xl"
                        : "text-base text-slate-300 sm:text-lg",
                    ].join(" ")}
                  >
                    {row.activity.trim() || "Untitled activity"}
                  </p>
                  {isCurrent && (row.anticipatedDifficulties || row.supportStrategies) && (
                    <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 text-sm text-slate-300 sm:grid-cols-2">
                      {row.anticipatedDifficulties && (
                        <div>
                          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Difficulties
                          </p>
                          <p className="leading-relaxed">{row.anticipatedDifficulties}</p>
                        </div>
                      )}
                      {row.supportStrategies && (
                        <div>
                          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Support
                          </p>
                          <p className="leading-relaxed">{row.supportStrategies}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {isCurrent && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-[11px] tabular-nums text-slate-400">
                        <span>{paused ? "Paused" : "In progress"}</span>
                        <span>
                          {remainingMin > 0 ? `~${remainingMin} min left` : "ending"}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-teal-400 transition-[width] duration-300 ease-linear"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 px-4 py-2 text-center text-xs tabular-nums text-slate-500">
        Total {formatDurationShort(totalDurationMinutes(rows))} · Clock{" "}
        {formatClock(now)}
      </footer>
    </div>
  );
}
