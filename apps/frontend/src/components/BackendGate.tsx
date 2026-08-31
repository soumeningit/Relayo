import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { PageLoader } from "./ui";

interface BackendGateProps {
  children: ReactNode;
}

const POLL_INTERVAL_MS = 3000;

const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || "";
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || API_BASE.replace(/\/api\/v1\/?$/, "");

function BackendGate({ children }: BackendGateProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
        if (!cancelled) {
          setReady(true);
          clearInterval(timer);
        }
      } catch {
        // Backend not up yet — keep polling.
      }
    };

    const timer = setInterval(check, POLL_INTERVAL_MS);
    void check();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!ready) return <PageLoader />;

  return <>{children}</>;
}

export default BackendGate;
