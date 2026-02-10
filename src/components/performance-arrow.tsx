import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface PerformanceArrowProps {
  current: number;
  previous: number;
  className?: string;
}

export default function PerformanceArrow({
  current,
  previous,
  className = "",
}: PerformanceArrowProps) {
  if (previous === 0) return null;

  const diff = current - previous;
  const percentage = Math.round((diff / previous) * 100);

  if (diff > 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400 ${className}`}
      >
        <ArrowUp className="h-3 w-3" />
        +{percentage}%
      </span>
    );
  }

  if (diff < 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-semibold text-red-400 ${className}`}
      >
        <ArrowDown className="h-3 w-3" />
        {percentage}%
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground ${className}`}
    >
      <Minus className="h-3 w-3" />
      Same
    </span>
  );
}
