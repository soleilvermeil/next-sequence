"use client";

import { Button } from "@/components/atoms/Button";
import { Modal, ModalCancelButton } from "@/components/molecules/Modal";

export function RowCommentModal({
  open,
  rowLabel,
  comment,
  onClose,
  onDelete,
  onAskSolve,
}: {
  open: boolean;
  rowLabel: string;
  comment: string;
  onClose: () => void;
  onDelete: () => void;
  onAskSolve: () => void;
}) {
  return (
    <Modal
      open={open}
      title="AI comment"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <Button variant="danger" onClick={onDelete}>
            Delete comment
          </Button>
          <Button variant="primary" onClick={onAskSolve}>
            Ask AI to solve
          </Button>
        </>
      }
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {rowLabel}
      </p>
      <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{comment}</p>
    </Modal>
  );
}
