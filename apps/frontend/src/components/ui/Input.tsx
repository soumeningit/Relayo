import { useId, type ComponentPropsWithRef, type ReactNode } from "react";

interface InputProps extends ComponentPropsWithRef<"input"> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`h-11 w-full rounded-xl border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/30"
              : "border-border hover:border-indigo-400/50 focus:border-indigo-400 focus:ring-indigo-500/30"
          } ${leftIcon ? "pl-11" : ""} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
