import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";
import { TenantProvider } from "./TenantContext";

export default function RootContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TenantProvider>{children}</TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
