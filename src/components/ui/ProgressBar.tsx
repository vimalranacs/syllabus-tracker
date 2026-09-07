interface ProgressBarProps {
  value: number;
  className?: string;
  height?: "xs" | "sm" | "md";
  color?: "pink" | "green" | "blue";
}

export function ProgressBar({ value, className = "", height = "sm", color = "pink" }: ProgressBarProps) {
  const heights = { xs: "h-1", sm: "h-1.5", md: "h-2" };
  const colors = {
    pink: "bg-pink-500",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
  };

  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className={"w-full bg-zinc-100 rounded-full overflow-hidden " + heights[height] + " " + className}>
      <div
        className={heights[height] + " " + colors[color] + " rounded-full transition-all duration-300"}
        style={{ width: clamped + "%" }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
