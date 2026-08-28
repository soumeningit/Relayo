import { useEffect, useState } from "react";
import { FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { useTenant } from "../../contexts/TenantContext";
import { useApiCall } from "../../hooks/useApiCall";
import * as apiKeyService from "../../api/services/ApiKeyService";
import { toast } from "sonner";
import {
  Button,
  EmptyState,
  PageLoader,
  TableWrapper,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";
import { timeAgo } from "../../lib/time";
import CreateKeyModal from "../../components/apikey/CreateKeyModal";
import type { ApiKey } from "../../types/apiKey";
import RotateKeyModal from "../../components/apikey/RotateKeyModal";
import RevokeKeyModal from "../../components/apikey/RevokeKeyModal";
import SecretRevelModal from "../../components/apikey/SecretRevelModal";

export default function ApiKeys() {
  const { tenant } = useTenant();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);

  // Form state
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null);

  const { isLoading: isActionLoading, run } = useApiCall();

  const fetchKeys = async () => {
    if (!tenant) return;
    try {
      const data = await apiKeyService.listApiKeys(tenant.id);
      setKeys(data);
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [tenant]);

  const resetOtpState = () => {
    setOtp("");
    setSelectedKey(null);
  };

  // --- HANDLERS ---

  const handleCreate = async () => {
    if (!tenant || !newKeyName.trim()) return;

    const result = await run(() =>
      apiKeyService.createApiKey(tenant.id, { name: newKeyName.trim() }),
    );
    if (!result) return;

    setCreateOpen(false);
    setNewKeyName("");

    setNewPlaintextKey(result.apiKey);
    setRevealOpen(true);
    toast.success("API Key created");
    fetchKeys();
  };

  const handleRotate = async () => {
    if (!tenant || !selectedKey || !otp.trim()) return;

    const result = await run(() =>
      apiKeyService.rotateApiKey(tenant.id, selectedKey.id, otp.trim()),
    );
    if (!result) return;

    setRotateOpen(false);
    resetOtpState();

    setNewPlaintextKey(result.apiKey);
    setRevealOpen(true);
    toast.success("API Key rotated");
    fetchKeys();
  };

  const handleRevoke = async () => {
    if (!tenant || !selectedKey || !otp.trim()) return;

    await run(() =>
      apiKeyService.revokeApiKey(tenant.id, selectedKey.id, otp.trim()),
    );
    if (!selectedKey) return; // run() returns void for revoke, so we check differently or just rely on try/catch inside run

    setRevokeOpen(false);
    resetOtpState();
    toast.success("API Key revoked");
    fetchKeys();
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">API Keys</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Authenticate your backend requests to Relayo.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <FiPlus aria-hidden="true" /> Create key
        </Button>
      </div>

      <div className="mt-6">
        {keys.length === 0 ? (
          <EmptyState
            title="No API keys"
            description="Create a key to start sending events to Relayo."
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Key</TH>
                <TH>Scopes</TH>
                <TH>Expires</TH>
                <TH>Last used</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {keys.map((key) => (
                <TR key={key.id}>
                  <TD className="font-medium text-sm">{key.name}</TD>
                  <TD>
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {key.prefix}
                    </code>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.length > 0 ? (
                        key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {scope}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Full Access
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {key.expiresAt ? timeAgo(key.expiresAt) : "Never"}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {key.lastUsedAt ? timeAgo(key.lastUsedAt) : "Never"}
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedKey(key);
                          setRotateOpen(true);
                        }}
                        title="Rotate key"
                      >
                        <FiRefreshCw aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedKey(key);
                          setRevokeOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Revoke key"
                      >
                        <FiTrash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </div>

      <CreateKeyModal
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        newKeyName={newKeyName}
        setNewKeyName={setNewKeyName}
        handleCreate={handleCreate}
        isActionLoading={isActionLoading}
      />

      <RotateKeyModal
        rotateOpen={rotateOpen}
        setRotateOpen={setRotateOpen}
        selectedKey={selectedKey}
        otp={otp}
        setOtp={setOtp}
        handleRotate={handleRotate}
        isActionLoading={isActionLoading}
        resetOtpState={resetOtpState}
      />

      <RevokeKeyModal
        revokeOpen={revokeOpen}
        setRevokeOpen={setRevokeOpen}
        selectedKey={selectedKey}
        otp={otp}
        setOtp={setOtp}
        handleRevoke={handleRevoke}
        isActionLoading={isActionLoading}
        resetOtpState={resetOtpState}
      />

      <SecretRevelModal
        revealOpen={revealOpen}
        setRevealOpen={setRevealOpen}
        newPlaintextKey={newPlaintextKey}
      />
    </div>
  );
}
