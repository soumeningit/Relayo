import { useState } from "react";
import { FiLock } from "react-icons/fi";
import { toast } from "sonner";
import { useApiCall } from "../../hooks/useApiCall";
import * as apiKeyService from "../../api/services/ApiKeyService";
import { getApiErrorMessage } from "../../lib/apiError";
import { Button, Modal, OtpInput } from "../ui";

interface MfaSetupModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  orgId: string;
  onSetupComplete: () => void;
}

function MfaSetupModal({
  open,
  setOpen,
  orgId,
  onSetupComplete,
}: MfaSetupModalProps) {
  const [started, setStarted] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const { isLoading, run } = useApiCall();

  const handleClose = () => {
    setStarted(false);
    setOtp("");
    setQrCode(null);
    setOpen(false);
  };

  const handleStart = async () => {
    const data = await run(() => apiKeyService.setupMfa(orgId), {
      showErrorToast: false,
      onError: (error) => {
        toast.error(getApiErrorMessage(error));
        handleClose();
      },
    });
    if (data === null) return;

    setQrCode(data.qrCode);
    setStarted(true);
  };

  const handleComplete = async () => {
    if (otp.length !== 6) return;

    const result = await run(() => apiKeyService.completeMfaSetup(orgId, otp), {
      showErrorToast: false,
      onError: (error) => {
        toast.error(getApiErrorMessage(error));
        setOtp("");
      },
    });
    if (result === null) return;

    handleClose();
    onSetupComplete();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Enable two-factor authentication"
      description="Relayo requires MFA before managing API keys."
      size="md"
    >
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10">
          <FiLock className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        </div>

        {!started ? (
          <>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
              Enable two-factor authentication to continue. You&apos;ll scan a
              QR code with your authenticator app and enter a one-time code.
            </p>
            <Button fullWidth className="mt-5" onClick={handleStart}>
              Continue
            </Button>
          </>
        ) : isLoading && !qrCode ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Generating your authenticator secret…
          </p>
        ) : qrCode ? (
          <>
            <img
              src={qrCode}
              alt="Authenticator app QR code"
              className="mt-4 rounded-xl border border-border bg-white p-3"
              style={{ width: 180, height: 180 }}
            />
            <p className="mt-3 max-w-xs text-center text-xs text-muted-foreground">
              Use Google Authenticator, Authy, or 1Password to scan this code.
            </p>

            <div className="mt-6 w-full">
              <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
            </div>

            <Button
              fullWidth
              className="mt-5"
              onClick={handleComplete}
              isLoading={isLoading}
              disabled={otp.length !== 6}
            >
              Enable & Continue
            </Button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

export default MfaSetupModal;