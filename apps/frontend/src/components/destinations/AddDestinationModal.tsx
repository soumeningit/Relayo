import { useState } from "react";
import { useApiCall } from "../../hooks/useApiCall";
import * as destinationService from "../../api/services/DestinationService";
import { useTenant } from "../../contexts/TenantContext";
import { Button, CopyButton, Input, Modal } from "../ui";

function AddDestinationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { tenant } = useTenant();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [secret, setSecret] = useState<string | null>(null);
  const { isLoading, run } = useApiCall();

  const reset = () => {
    setName("");
    setUrl("");
    setError(undefined);
    setSecret(null);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleSubmit = async () => {
    if (!tenant) return;
    const trimmed = url.trim();
    try {
      new URL(trimmed);
    } catch {
      setError("Enter a valid URL including https://");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(undefined);

    const result = await run(
      () =>
        destinationService.createDestination(tenant.id, {
          name: name.trim(),
          url: trimmed,
        }),
      { showErrorToast: false },
    );
    if (!result) return;
    setSecret(result.signingSecret);
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={secret ? "Destination created" : "Register a destination"}
      description={
        secret
          ? undefined
          : "We'll deliver every matching event to this endpoint, signed with a per-destination secret."
      }
    >
      {secret ? (
        <div>
          <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3.5 text-xs leading-relaxed text-muted-foreground">
            ⚠ This signing secret is shown <strong>once</strong>. Store it in
            your endpoint's config now — you'll need it to verify
            X-Relayo-Signature headers.
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-input p-3.5">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
              {secret}
            </code>
            <CopyButton value={secret} label="Secret" />
          </div>
          <Button fullWidth className="mt-5" onClick={handleClose}>
            I've stored it safely
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          noValidate
          className="space-y-4"
        >
          <Input
            label="Destination name"
            type="text"
            placeholder="My app's webhook"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(undefined);
            }}
            error={error}
            hint="A friendly name to identify this destination"
            disabled={isLoading}
            autoFocus
          />
          <Input
            label="Endpoint URL"
            type="url"
            placeholder="https://api.yourapp.com/hooks/relayo"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(undefined);
            }}
            hint="Must be a reachable HTTPS endpoint"
            disabled={isLoading}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create destination
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default AddDestinationModal;
