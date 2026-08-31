import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/axios";
import { PageLoader } from "./ui";

interface BackendGateProps {
  children: ReactNode;
}

const POLL_INTERVAL_MS = 3000;

function BackendGate({ children }: BackendGateProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await api.get("/health", { timeout: 5000 });
        if (!cancelled) setReady(true);
      } catch {
        // Backend not up yet — keep polling.
      }
    };

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!ready) return <PageLoader />;

  return <>{children}</>;
}

export default BackendGate;
