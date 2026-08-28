import { Toaster } from "sonner";
import { useTheme } from "./ThemeContext";
import type { ReactNode } from "react";

export function ToastProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme={resolvedTheme}
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans, Inter, sans-serif)",
          },
        }}
      />
    </>
  );
}
