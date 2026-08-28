import { useState } from "react";
import { Button, Modal, Input } from "../ui";
import { toast } from "sonner";
import { FiShield, FiAlertTriangle } from "react-icons/fi";

export default function SecuritySection() {
  // Mock Data: Starts as disabled
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Mock QR Code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const handleInitiateEnable = () => {
    // In real app, this calls setupMfa(orgId) and sets the QR code
    setQrCode(
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiPk1vY2sgUVE8L3RleHQ+PC9zdmc+",
    ); // Mock base64 svg
    setShowEnableModal(true);
  };

  const handleCompleteEnable = () => {
    if (!otp.trim()) return;
    // Mock completion
    setMfaEnabled(true);
    setShowEnableModal(false);
    setOtp("");
    setQrCode(null);
    toast.success("Two-factor authentication enabled");
  };

  const handleDisable = () => {
    // Mock disable
    setMfaEnabled(false);
    setShowDisableModal(false);
    toast.success("Two-factor authentication disabled");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-base font-semibold text-foreground">
        Security
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Protect your account with two-factor authentication (2FA).
      </p>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-input/50 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${mfaEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
          >
            <FiShield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-muted-foreground">
              {mfaEnabled
                ? "Your account is secured with an authenticator app."
                : "Add an extra layer of security to your account."}
            </p>
          </div>
        </div>

        {mfaEnabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisableModal(true)}
          >
            Disable 2FA
          </Button>
        ) : (
          <Button size="sm" onClick={handleInitiateEnable}>
            Enable 2FA
          </Button>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Enable MFA Modal (Shows QR Code) */}
      <Modal
        open={showEnableModal}
        onClose={() => {
          setShowEnableModal(false);
          setQrCode(null);
          setOtp("");
        }}
        title="Enable Two-Factor Authentication"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app (like Google
          Authenticator or Authy), then enter the 6-digit code to verify.
        </p>

        {qrCode && (
          <div className="mt-4 flex justify-center rounded-xl border border-border bg-white p-4">
            <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
          </div>
        )}

        <div className="mt-4">
          <Input
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            autoFocus
          />
        </div>
        <Button fullWidth className="mt-5" onClick={handleCompleteEnable}>
          Verify & Enable
        </Button>
      </Modal>

      {/* 2. Disable MFA Modal (Confirmation) */}
      <Modal
        open={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable Two-Factor Authentication?"
        size="sm"
      >
        <div className="flex items-start gap-3 text-destructive">
          <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            This will lower the security of your account. API key rotation and
            creation will no longer require an OTP. Are you sure?
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisableModal(false)}
          >
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={handleDisable}>
            Yes, disable 2FA
          </Button>
        </div>
      </Modal>
    </div>
  );
}
