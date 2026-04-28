interface StatusPillProps {
  label: string;
  tone?: "neutral" | "active" | "warning";
}

export const StatusPill = ({ label, tone = "neutral" }: StatusPillProps) => (
  <span className={`status-pill status-pill-${tone}`}>{label}</span>
);
