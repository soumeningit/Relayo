import { Button, Input, Modal } from "../ui";

interface CreateKeyModalProps {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  handleCreate: () => void;
  isActionLoading: boolean;
}

function CreateKeyModal({
  createOpen,
  setCreateOpen,
  newKeyName,
  setNewKeyName,
  handleCreate,
  isActionLoading,
}: CreateKeyModalProps) {
  return (
    <Modal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      title="Create API Key"
      size="sm"
    >
      <p className="text-sm text-muted-foreground">
        Give your key a descriptive name so you know what it's used for.
      </p>
      <div className="mt-4">
        <Input
          placeholder="e.g., Production Backend"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          autoFocus
        />
      </div>
      <Button
        fullWidth
        className="mt-5"
        onClick={handleCreate}
        isLoading={isActionLoading}
      >
        Create Key
      </Button>
    </Modal>
  );
}

export default CreateKeyModal;
