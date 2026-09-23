"use client";

import { Button } from "@/components/atoms/Button";
import { Modal, ModalCancelButton } from "@/components/molecules/Modal";
import type { ConfigSwitchImpact } from "@/lib/types";
import { getConfig } from "@/lib/configs";

export function ConfigSwitchModal({
  impact,
  onConfirm,
  onCancel,
}: {
  impact: ConfigSwitchImpact | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!impact) return null;

  const toLabel = getConfig(impact.toId).label;
  const fromLabel = getConfig(impact.fromId).label;

  return (
    <Modal
      open={Boolean(impact)}
      title="Switch table configuration?"
      onClose={onCancel}
      footer={
        <>
          <ModalCancelButton onClick={onCancel} />
          <Button variant="primary" onClick={onConfirm}>
            Continue to {toLabel}
          </Button>
        </>
      }
    >
      <p className="mb-3 leading-relaxed">
        Switching from <strong>{fromLabel}</strong> to <strong>{toLabel}</strong>{" "}
        will hide columns that contain data. Values are kept in memory and will
        reappear if you switch back to a configuration that includes them — but
        they will no longer be visible or editable in the new layout.
      </p>
      <ul className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2.5">
        {impact.droppedWithData.map((item) => (
          <li key={item.key} className="text-amber-950">
            <span className="font-medium">{item.label}</span>
            <span className="text-amber-800/80">
              {" "}
              — data in {item.nonEmptyCount}{" "}
              {item.nonEmptyCount === 1 ? "row" : "rows"} will be hidden
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
