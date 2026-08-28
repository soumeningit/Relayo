import { useState, type ComponentPropsWithRef } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input } from "./Input";

type PasswordInputProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function PasswordInput({
  label,
  error,
  hint,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        label={label}
        error={error}
        hint={hint}
        className="pr-11"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-[38px] rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
    </div>
  );
}
