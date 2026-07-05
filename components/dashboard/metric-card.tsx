type MetricCardProps = {
  label: string;
  value: string;
  variant?: "default" | "danger";
};

export function MetricCard({ label, value, variant = "default" }: MetricCardProps) {
  const isDanger = variant === "danger";

  return (
    <div
      className="min-w-0 rounded-lg border px-4 py-4 sm:px-6 sm:py-5"
      style={{
        backgroundColor: isDanger ? "var(--color-danger-bg)" : "var(--color-surface)",
        borderColor: isDanger ? "var(--color-danger-border)" : "var(--color-border)",
      }}
    >
      <p
        className="text-sm"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text-muted)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 truncate text-xl font-medium sm:text-2xl"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text)" }}
      >
        {value}
      </p>
    </div>
  );
}
