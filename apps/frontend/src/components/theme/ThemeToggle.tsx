import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme, type ThemeMode } from "../../contexts/ThemeContext";

const options: { mode: ThemeMode; icon: typeof FiSun; label: string }[] = [
  { mode: "light", icon: FiSun, label: "Switch to light theme" },
  { mode: "dark", icon: FiMoon, label: "Switch to dark theme" },
  { mode: "system", icon: FiMonitor, label: "Use system default theme" },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1"
    >
      {options.map(({ mode: optionMode, icon: Icon, label }) => (
        <button
          key={optionMode}
          role="radio"
          aria-checked={mode === optionMode}
          aria-label={label}
          title={label}
          onClick={() => setMode(optionMode)}
          className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ${
            mode === optionMode
              ? "bg-indigo-500/15 text-indigo-500 dark:text-indigo-300"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
