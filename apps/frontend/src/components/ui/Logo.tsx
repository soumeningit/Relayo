import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
}

const markSize = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-11 w-11" } as const;
const textSize = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

export function Logo({ size = "md", withWordmark = true }: LogoProps) {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="Relayo home"
    >
      <span
        className={`relative grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105 ${markSize[size]}`}
      >
        <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden="true">
          <path d="M36.5 10 18 36h11l-3.5 18L46 27H34l2.5-17z" fill="#fff" />
        </svg>
      </span>
      {withWordmark && (
        <span
          className={`font-display font-bold tracking-tight text-foreground ${textSize[size]}`}
        >
          Relayo
        </span>
      )}
    </Link>
  );
}
