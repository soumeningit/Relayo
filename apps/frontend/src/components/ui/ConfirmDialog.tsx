import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  isLoading = false,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        {destructive && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-500">
            <FiAlertTriangle aria-hidden="true" />
          </span>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
