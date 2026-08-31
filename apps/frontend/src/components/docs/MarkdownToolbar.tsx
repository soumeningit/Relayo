import type { ReactNode, RefObject } from "react";
import {
  FiBold,
  FiCode,
  FiItalic,
  FiLink,
  FiList,
  FiMessageSquare,
} from "react-icons/fi";

type InlineTransform = { type: "inline"; before: string; after: string };
type BlockTransform = { type: "block"; prefix: string };
type Command = InlineTransform | BlockTransform | { type: "link" };

const COMMANDS: { key: string; title: string; icon?: ReactNode; label?: string; parts: () => Command }[] = [
  { key: "bold", title: "Bold", icon: <FiBold size={15} />, parts: () => ({ type: "inline", before: "**", after: "**" }) },
  { key: "italic", title: "Italic", icon: <FiItalic size={15} />, parts: () => ({ type: "inline", before: "_", after: "_" }) },
  { key: "h2", title: "Heading 2", label: "H2", parts: () => ({ type: "block", prefix: "## " }) },
  { key: "h3", title: "Heading 3", label: "H3", parts: () => ({ type: "block", prefix: "### " }) },
  { key: "link", title: "Link", icon: <FiLink size={15} />, parts: () => ({ type: "link" }) },
  { key: "code", title: "Inline code", icon: <FiCode size={15} />, parts: () => ({ type: "inline", before: "`", after: "`" }) },
  { key: "quote", title: "Blockquote", icon: <FiMessageSquare size={15} />, parts: () => ({ type: "block", prefix: "> " }) },
  { key: "list", title: "Bullet list", icon: <FiList size={15} />, parts: () => ({ type: "block", prefix: "- " }) },
];

function applyCommand(
  value: string,
  start: number,
  end: number,
  command: Command,
): { value: string; caret: number } {
  const selected = value.slice(start, end);

  switch (command.type) {
    case "inline": {
      const next =
        value.slice(0, start) + command.before + selected + command.after + value.slice(end);
      const caret =
        start === end
          ? start + command.before.length
          : start + command.before.length + selected.length + command.after.length;
      return { value: next, caret };
    }
    case "block": {
      const head = value.slice(0, start);
      const rest = value.slice(start, end);
      const lines = rest.length > 0 ? rest.split("\n") : [""];
      const newRest = lines.map((line) => command.prefix + line).join("\n");
      const next = head + newRest + value.slice(end);
      const caret = start === end ? start + command.prefix.length : start + newRest.length;
      return { value: next, caret };
    }
    case "link": {
      const text = selected || "title";
      const next = value.slice(0, start) + `[${text}](url)` + value.slice(end);
      const caret = start + text.length + 3;
      return { value: next, caret };
    }
  }
}

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const run = (parts: () => Command) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const result = applyCommand(value, selectionStart, selectionEnd, parts());
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.min(result.caret, result.value.length);
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-border bg-muted/50 px-2 py-1.5"
      aria-label="Markdown toolbar"
    >
      {COMMANDS.map((item, index) => (
        <div key={item.key} className="flex items-center gap-1">
          {index === 5 && <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />}
          <button
            type="button"
            title={item.title}
            aria-label={item.title}
            onClick={() => run(item.parts)}
            className="grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-indigo-500/12 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            {item.icon ?? item.label}
          </button>
        </div>
      ))}
    </div>
  );
}