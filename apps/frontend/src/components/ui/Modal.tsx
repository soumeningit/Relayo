import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { motion } from "motion/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full ${sizeClasses[size]} rounded-2xl border border-border bg-card p-6 shadow-2xl`}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <FiX size={18} />
        </button>
        <h2 className="pr-8 font-display text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-5">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
