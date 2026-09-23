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

  return {
    active: true,
    mode,
    currentIndex: indexAtTime(rows, baseOriginMs, now),
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

function indexAtTime(
  rows: ActivityRow[],
  originMs: number,
  nowMs: number,
): number {
  if (rows.length === 0) return 0;
  const times = activityAbsoluteTimes(rows, originMs);
  let idx = 0;
  for (let i = 0; i < times.length; i++) {
    if (nowMs >= times[i].startMs) idx = i;
  }
  const last = times[times.length - 1];
  if (last && nowMs >= last.endMs) idx = times.length - 1;
  return idx;
}

export function createInitialPlayState(
  rows: ActivityRow[],
  mode: PlayModeOption,
): PlayState {
  return buildPlayState(rows, mode);
}

type TimelineTone = "official" | "custom";

function TimelinePanel({
  label,
  tone,
  rows,
  currentIndex,
  times,
  nowMs,
  interactive,
  paused,
  onSelect,
}: {
  label: string;
  tone: TimelineTone;
  rows: ActivityRow[];
  currentIndex: number;
  times: { startMs: number; endMs: number }[];
  nowMs: number;
  interactive: boolean;
  paused?: boolean;
  onSelect?: (index: number) => void;
}) {
  const current = rows[currentIndex];
  const currentTime = times[currentIndex];
  const progress =
    currentTime && current?.duration
      ? Math.min(
          1,
          Math.max(0, (nowMs - currentTime.startMs) / (current.duration * 60000)),
        )
      : 0;
  const remainingMs = currentTime ? Math.max(0, currentTime.endMs - nowMs) : 0;
  const remainingMin = Math.ceil(remainingMs / 60000);

  const accent =
    tone === "official"
      ? {
          header: "text-slate-300",
          current:
            "border-slate-400/40 bg-slate-800/60 shadow-lg shadow-black/20",
          bar: "bg-slate-300",
        }
      : {
          header: "text-teal-200/90",
          current:
            "border-teal-400/50 bg-teal-900/40 shadow-lg shadow-teal-950/40",
          bar: "bg-teal-400",
        };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={[
          "flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5",
          tone === "official"
            ? "border-white/10 bg-slate-900/80"
            : "border-teal-500/20 bg-teal-950/40",
        ].join(" ")}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${accent.header}`}
        >
          {label}
        </p>
        {currentTime && (
          <p className="text-xs tabular-nums text-slate-400">
            {formatClock(currentTime.startMs)} – {formatClock(currentTime.endMs)}
          </p>
        )}
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          className="absolute inset-0 overflow-y-auto px-3 py-6 sm:px-4"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 6%, black 90%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 6%, black 90%, transparent)",
          }}
        >
          <div className="mx-auto flex max-w-xl flex-col gap-2.5">
            {rows.map((row, index) => {
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const slot = times[index];
              const className = [
                "rounded-lg border px-3.5 py-3.5 text-left transition-all duration-500",
                isCurrent
                  ? accent.current
                  : isPast
                    ? "border-transparent bg-white/[0.03] opacity-40"
                    : "border-white/10 bg-white/[0.04] opacity-70",
                interactive && !isCurrent ? "hover:opacity-95" : "",
                interactive ? "cursor-pointer" : "cursor-default",
              ].join(" ");

              const body = (
                <>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium tabular-nums text-slate-500">
                      {index + 1}/{rows.length}
                    </span>
                    {row.activityType && (
                      <span className="text-[11px] text-slate-500">
                        {row.activityType}
                      </span>
                    )}
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {formatDurationShort(row.duration)}
                    </span>
                    {slot && (
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {formatClock(slot.startMs)}
                      </span>
                    )}
                  </div>
                  <p
                    className={[
                      "leading-snug text-balance",
                      isCurrent
                        ? "text-xl font-medium tracking-tight text-white sm:text-2xl"
                        : "text-sm text-slate-300 sm:text-base",
                    ].join(" ")}
                  >
                    {row.activity.trim() || "Untitled activity"}
                  </p>
                  {isCurrent &&
                    (row.anticipatedDifficulties || row.supportStrategies) && (
                      <div className="mt-2.5 grid gap-2 border-t border-white/10 pt-2.5 text-xs text-slate-300 sm:grid-cols-2 sm:text-sm">
                        {row.anticipatedDifficulties && (
                          <div>
                            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              Difficulties
                            </p>
                            <p className="leading-relaxed">
                              {row.anticipatedDifficulties}
                            </p>
                          </div>
                        )}
                        {row.supportStrategies && (
                          <div>
                            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              Support
                            </p>
                            <p className="leading-relaxed">
                              {row.supportStrategies}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  {isCurrent && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] tabular-nums text-slate-400">
                        <span>
                          {paused
                            ? "Paused"
                            : tone === "official"
                              ? "Official"
                              : "In progress"}
                        </span>
                        <span>
                          {remainingMin > 0
                            ? `~${remainingMin} min left`
                            : "ending"}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${accent.bar}`}
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              );

              if (interactive && onSelect) {
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelect(index)}
                    className={className}
                  >
                    {body}
                  </button>
                );
              }

              return (
                <div key={row.id} className={className}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [wallNow, setWallNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  /** Official clock always advances. */
  useEffect(() => {
    const id = window.setInterval(() => setWallNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  /** Custom clock freezes while paused. */
  const customNow = paused && pausedAt !== null ? pausedAt : wallNow;

  const officialTimes = useMemo(
    () => activityAbsoluteTimes(rows, play.baseOriginMs),
    [rows, play.baseOriginMs],
  );
  const customTimes = useMemo(
    () => activityAbsoluteTimes(rows, play.timelineOriginMs),
    [rows, play.timelineOriginMs],
  );

  const officialIndex = useMemo(
    () => indexAtTime(rows, play.baseOriginMs, wallNow),
    [rows, play.baseOriginMs, wallNow],
  );

  /** While synced, follow the official timeline. */
  useEffect(() => {
    if (!play.active || play.offTimeline) return;
    if (officialIndex !== play.currentIndex) {
      onPlayChange({ ...play, currentIndex: officialIndex });
    }
  }, [officialIndex, play, onPlayChange]);

  /** While desynced and not paused, advance the custom timeline. */
  useEffect(() => {
    if (!play.active || !play.offTimeline || paused) return;
    const idx = indexAtTime(rows, play.timelineOriginMs, customNow);
    if (idx !== play.currentIndex) {
      onPlayChange({ ...play, currentIndex: idx });
    }
  }, [customNow, rows, play, onPlayChange, paused]);

  const desync = () => {
    if (!play.offTimeline) {
      onPlayChange({ ...play, offTimeline: true });
    }
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    const offsets = getCumulativeOffsets(rows);
    const newOrigin = Date.now() - offsets[clamped] * 60000;

    onPlayChange({
      ...play,
      currentIndex: clamped,
      timelineOriginMs: newOrigin,
      offTimeline: true,
    });
    setWallNow(Date.now());
    setPaused(false);
    setPausedAt(null);
  };

  const syncBack = () => {
    onPlayChange({
      ...play,
      timelineOriginMs: play.baseOriginMs,
      currentIndex: indexAtTime(rows, play.baseOriginMs, Date.now()),
      offTimeline: false,
    });
    setWallNow(Date.now());
    setPaused(false);
    setPausedAt(null);
  };

  const togglePause = () => {
    if (!paused) {
      // Pausing always desyncs: official keeps running, custom freezes.
      desync();
      setPaused(true);
      setPausedAt(Date.now());
    } else {
      if (pausedAt !== null) {
        const delta = Date.now() - pausedAt;
        // Shift only the custom timeline so it resumes where it left off.
        // Official origin stays untouched.
        onPlayChange({
          ...play,
          timelineOriginMs: play.timelineOriginMs + delta,
          offTimeline: true,
        });
      }
      setPaused(false);
      setPausedAt(null);
      setWallNow(Date.now());
    }
  };

  const split = play.offTimeline;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-white">
            Sequence
          </p>
          <p className="truncate text-sm text-slate-400">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {split ? (
            <Badge tone="warn">Desynced</Badge>
          ) : (
            <Badge tone="accent">On schedule</Badge>
          )}
          <Badge tone="neutral">
            {play.mode === "sync" ? "Wall-clock start" : "Started now"}
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

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-white/10 px-4 py-3">
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
        {split && (
          <Button variant="primary" size="sm" onClick={syncBack}>
            <SyncIcon className="h-3.5 w-3.5" />
            Sync to schedule
          </Button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {split ? (
          <div className="absolute inset-0 grid min-h-0 grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
            <div className="min-h-0 border-b border-white/10 md:border-b-0 md:border-r md:border-white/10">
              <TimelinePanel
                label="Official timeline"
                tone="official"
                rows={rows}
                currentIndex={officialIndex}
                times={officialTimes}
                nowMs={wallNow}
                interactive={false}
              />
            </div>
            <div className="min-h-0">
              <TimelinePanel
                label="Your timeline"
                tone="custom"
                rows={rows}
                currentIndex={play.currentIndex}
                times={customTimes}
                nowMs={customNow}
                interactive
                paused={paused}
                onSelect={goTo}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <TimelinePanel
              label="Official timeline"
              tone="custom"
              rows={rows}
              currentIndex={play.currentIndex}
              times={officialTimes}
              nowMs={wallNow}
              interactive
              onSelect={goTo}
            />
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-xs tabular-nums text-slate-500">
        Total {formatDurationShort(totalDurationMinutes(rows))} · Clock{" "}
        {formatClock(wallNow)}
        {split && (
          <span>
            {" "}
            · Official #{officialIndex + 1}
            {paused ? " · Custom paused" : ` · Custom #${play.currentIndex + 1}`}
          </span>
        )}
      </footer>
    </div>
  );
}
