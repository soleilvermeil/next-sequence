"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Modal, ModalCancelButton } from "@/components/molecules/Modal";
import { Select } from "@/components/atoms/Select";
import { Label } from "@/components/atoms/Label";
import type { PlayModeOption } from "@/lib/types";

export function PlayStartModal({
  open,
  hasTiming,
  onClose,
  onStart,
}: {
  open: boolean;
  hasTiming: boolean;
  onClose: () => void;
  onStart: (mode: PlayModeOption) => void;
}) {
  const [mode, setMode] = useState<PlayModeOption>("now");

  useEffect(() => {
    if (open) setMode(hasTiming ? "sync" : "now");
  }, [open, hasTiming]);

  return (
    <Modal
      open={open}
      title="Play sequence"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <Button variant="primary" onClick={() => onStart(mode)}>
            Start
          </Button>
        </>
      }
    >
      <p className="mb-4 leading-relaxed text-slate-600">
        Run the lesson as a teleprompter. The current activity stays emphasized;
        timing advances automatically from durations
        {hasTiming ? " (and optional schedule sync)" : ""}.
      </p>
      {hasTiming ? (
        <div className="space-y-1.5">
          <Label htmlFor="play-mode">Timing</Label>
          <Select
            id="play-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PlayModeOption)}
            options={[
              {
                value: "sync",
                label: "Sync with scheduled start times",
              },
              {
                value: "now",
                label: "Start now (ignore wall-clock times)",
              },
            ]}
          />
          <p className="pt-1 text-xs text-slate-500">
            Sync uses the first activity&apos;s start time as the schedule anchor.
            If no start time is set, play begins immediately.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          This configuration has no schedule columns. Playback will start now and
          advance by each activity&apos;s duration.
        </p>
      )}
    </Modal>
  );
}
