type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonVariant = Variant;
export type ButtonSize = Size;

const variantClasses: Record<Variant, string> = {
  primary:
    "text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/20 focus-visible:outline-indigo-400",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted focus-visible:outline-indigo-400",
  ghost:
    "bg-transparent text-foreground hover:bg-muted focus-visible:outline-indigo-400",
  danger:
    "text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 focus-visible:outline-red-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-13 px-7 text-base rounded-xl gap-2",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  fullWidth = false,
  extra = "",
) {
  return `inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${extra}`;
}
