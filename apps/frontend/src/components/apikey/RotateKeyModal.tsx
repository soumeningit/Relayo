import type { ApiKey } from "../../types/apiKey";
import { Button, Input, Modal } from "../ui";

interface RotateKeyModalProps {
  rotateOpen: boolean;
  setRotateOpen: (open: boolean) => void;
  selectedKey: ApiKey | null;
  otp: string;
  setOtp: (otp: string) => void;
  handleRotate: () => void;
  isActionLoading: boolean;
  resetOtpState: () => void;
}

function RotateKeyModal({
  rotateOpen,
  setRotateOpen,
  selectedKey,
  otp,
  setOtp,
  handleRotate,
  isActionLoading,
  resetOtpState,
}: RotateKeyModalProps) {
  return (
    <Modal
      open={rotateOpen}
      onClose={() => {
        setRotateOpen(false);
        resetOtpState();
      }}
      title="Rotate API Key"
      size="sm"
    >
      <p className="text-sm text-muted-foreground">
        This will generate a new key for <strong>{selectedKey?.name}</strong>.
        The old key will stop working immediately.
      </p>
      <div className="mt-4">
        <Input
          placeholder="Enter your MFA OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          autoFocus
        />
      </div>
      <Button
        fullWidth
        className="mt-5"
        onClick={handleRotate}
        isLoading={isActionLoading}
        disabled={!otp.trim()}
      >
        Verify & Rotate
      </Button>
    </Modal>
  );
}

export default RotateKeyModal;
