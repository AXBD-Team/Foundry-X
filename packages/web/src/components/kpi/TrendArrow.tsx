type Trend = "up" | "down" | "stable" | "unknown";

interface TrendArrowProps {
  trend: Trend;
  positiveDirection?: "up" | "down";
  size?: number;
  className?: string;
}

const ARROW: Record<Trend, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
  unknown: "—",
};

export function TrendArrow({
  trend,
  positiveDirection = "up",
  size = 14,
  className = "",
}: TrendArrowProps) {
  const isPositive =
    (trend === "up" && positiveDirection === "up") ||
    (trend === "down" && positiveDirection === "down");
  const isNegative =
    (trend === "up" && positiveDirection === "down") ||
    (trend === "down" && positiveDirection === "up");

  const color = isPositive
    ? "text-green-500"
    : isNegative
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <span
      role="img"
      aria-label={`trend ${trend}`}
      className={`${color} ${className}`}
      style={{ fontSize: size }}
    >
      {ARROW[trend]}
    </span>
  );
}
