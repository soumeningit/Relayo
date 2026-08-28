import type { SVGProps } from "react";

export function Spinner({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background"
      role="status"
      aria-label="Loading page"
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-indigo-500/15" />
        <Spinner className="h-10 w-10 text-indigo-500" />
      </div>
    </div>
  );
}
