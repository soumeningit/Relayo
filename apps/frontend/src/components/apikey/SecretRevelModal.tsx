import { Button, CopyButton, Modal } from "../ui";

interface SecretRevelModalProps {
  revealOpen: boolean;
  setRevealOpen: (open: boolean) => void;
  newPlaintextKey: string | null;
}

function SecretRevelModal({
  revealOpen,
  setRevealOpen,
  newPlaintextKey,
}: SecretRevelModalProps) {
  return (
    <Modal
      open={revealOpen}
      onClose={() => setRevealOpen(false)}
      title="Your new API key"
      size="md"
    >
      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3.5 text-xs leading-relaxed text-muted-foreground">
        ⚠ Shown once. Copy this key now. You will never be able to see it
        again.
      </p>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-input p-3.5">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
          {newPlaintextKey}
        </code>
        <CopyButton value={newPlaintextKey ?? ""} label="API Key" />
      </div>
      <Button fullWidth className="mt-5" onClick={() => setRevealOpen(false)}>
        I've saved it safely
      </Button>
    </Modal>
  );
}

export default SecretRevelModal;
