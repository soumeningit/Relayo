import type { ComponentPropsWithRef } from "react";
import { Spinner } from "./Spinner";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={buttonClasses(variant, size, fullWidth, className)}
      {...props}
    >
      {isLoading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
