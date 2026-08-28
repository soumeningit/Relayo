import type { ApiKey } from "../../types/apiKey";
import { Button, Input, Modal } from "../ui";

interface RevokeKeyModalProps {
  revokeOpen: boolean;
  setRevokeOpen: (open: boolean) => void;
  selectedKey: ApiKey | null;
  otp: string;
  setOtp: (otp: string) => void;
  handleRevoke: () => void;
  isActionLoading: boolean;
  resetOtpState: () => void;
}

function RevokeKeyModal({
  revokeOpen,
  setRevokeOpen,
  selectedKey,
  otp,
  setOtp,
  handleRevoke,
  isActionLoading,
  resetOtpState,
}: RevokeKeyModalProps) {
  return (
    <Modal
      open={revokeOpen}
      onClose={() => {
        setRevokeOpen(false);
        resetOtpState();
      }}
      title="Revoke API Key"
      size="sm"
    >
      <p className="text-sm text-destructive">
        Are you sure you want to revoke <strong>{selectedKey?.name}</strong>?
        Any system using this key will immediately lose access.
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
        onClick={handleRevoke}
        isLoading={isActionLoading}
        disabled={!otp.trim()}
        variant="danger"
      >
        Verify & Revoke
      </Button>
    </Modal>
  );
}

export default RevokeKeyModal;
