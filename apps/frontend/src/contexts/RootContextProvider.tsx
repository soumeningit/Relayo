import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";
import { TenantProvider } from "./TenantContext";
import { AdminProvider } from "./AdminContext";

export default function RootContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TenantProvider>
            <AdminProvider>{children}</AdminProvider>
          </TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
