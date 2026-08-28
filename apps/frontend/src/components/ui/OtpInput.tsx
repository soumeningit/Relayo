import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  };

  const setDigitAt = (index: number, digit: string) => {
    const chars = value.split("");
    while (chars.length < length) chars.push("");
    chars[index] = digit;
    onChange(chars.join("").replace(/\s/g, ""));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    if (digits.length > 1) {
      // Multiple chars (e.g. mobile autocorrect) — fill forward
      const chars = value.split("");
      for (let i = 0; i < digits.length && index + i < length; i++) {
        chars[index + i] = digits[i];
      }
      onChange(chars.slice(0, length).join(""));
      focusAt(index + digits.length);
      return;
    }

    setDigitAt(index, digits);
    if (index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        focusAt(index - 1);
        setDigitAt(index - 1, "");
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    onChange(digits.slice(0, length));
    focusAt(Math.min(digits.length, length - 1));
  };

  return (
    <div
      className="flex items-center justify-between gap-2 sm:gap-3"
      role="group"
      aria-label="One-time code input"
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${index + 1}`}
          maxLength={length}
          disabled={disabled}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="h-13 w-full max-w-[52px] rounded-xl border border-border bg-input text-center font-display text-lg font-semibold text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 sm:h-14 sm:text-xl"
        />
      ))}
    </div>
  );
}
