import { useState } from "react";
import { toast } from "sonner";
import { FiCheck, FiCopy } from "react-icons/fi";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success(label ? `${label} copied` : "Copied to clipboard");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {copied ? (
        <FiCheck className="text-emerald-500" size={14} />
      ) : (
        <FiCopy size={14} />
      )}
      Copy
    </button>
  );
}
