/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getMyOrganizations } from "../api/services/OrgService";
import { PageLoader } from "../components/ui/Spinner";
import { useAuth } from "./AuthContext";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  completedSteps: number;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  setTenant: (tenant: Tenant | null) => void;
  refresh: () => Promise<Tenant | null>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function toTenant(org: {
  id: string;
  name: string;
  slug: string;
  status: Tenant["status"];
  completedSteps: number;
}): Tenant {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    completedSteps: org.completedSteps,
  };
}

function TenantProviderInner({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     setTenantState(null);
  //     setIsLoading(false);
  //     return;
  //   }
  //   let cancelled = false;

  //   // Restore session state from server — setState inside promise callback
  //   getMyOrganizations()
  //     .then((orgs) => {
  //       if (cancelled) return;
  //       setTenantState(orgs.length > 0 ? toTenant(orgs[0]) : null);
  //     })
  //     .catch(() => {
  //       // Not fatal — treat as no organization; user can retry via refresh
  //     })
  //     .finally(() => {
  //       if (!cancelled) setIsLoading(false);
  //     });

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTenantState(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);

    getMyOrganizations()
      .then((orgs) => {
        if (cancelled) return;

        setTenantState(orgs.length > 0 ? toTenant(orgs[0]) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setTenantState(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const setTenant = (next: Tenant | null) => setTenantState(next);

  // const refresh = async () => {
  //   try {
  //     const orgs = await getMyOrganizations();
  //     const next = orgs.length > 0 ? toTenant(orgs[0]) : null;
  //     setTenantState(next);
  //     return next;
  //   } catch {
  //     return null;
  //   }
  // };

  const refresh = async () => {
    if (!isAuthenticated) {
      setTenantState(null);
      return null;
    }

    try {
      const orgs = await getMyOrganizations();

      const next = orgs.length > 0 ? toTenant(orgs[0]) : null;

      setTenantState(next);

      return next;
    } catch {
      return null;
    }
  };

  return (
    <TenantContext.Provider value={{ tenant, isLoading, setTenant, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function TenantProvider({ children }: { children: ReactNode }) {
  return <TenantProviderInner>{children}</TenantProviderInner>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context)
    throw new Error("useTenant must be used within a TenantProvider");
  return context;
}

/**
 * Blocks dashboard content until the signed-in user finishes onboarding.
 * Resume logic is driven by the server's completedSteps:
 *   none          → /dashboard/onboarding              (step 1 · create)
 *   steps === 1   → /dashboard/onboarding/:slug/pay    (step 2 · payment)
 *   steps >= 2    → allow (details are optional, editable later)
 */
export function RequireTenant() {
  const { tenant, isLoading } = useTenant();

  if (isLoading) return <PageLoader />;

  if (!tenant) return <Navigate to="/dashboard/onboarding" replace />;

  if (tenant.completedSteps < 2) {
    return <Navigate to={`/dashboard/onboarding/${tenant.slug}/pay`} replace />;
  }

  return <Outlet />;
}
