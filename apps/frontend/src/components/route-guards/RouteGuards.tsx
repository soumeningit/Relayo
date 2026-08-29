import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAdmin } from "../../contexts/AdminContext";
import { PageLoader } from "../ui/Spinner";

interface GuardProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function PublicOnlyRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children ? <>{children}</> : <Outlet />;
}

export function AdminProtectedRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAdmin();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function AdminPublicOnlyRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;
  return children ? <>{children}</> : <Outlet />;
}
