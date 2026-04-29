interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

export const Toggle = ({ checked, onChange, label, hint }: ToggleProps) => (
  <button
    type="button"
    className={`toggle-row${checked ? " is-on" : ""}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="toggle-copy">
      <span className="toggle-label">{label}</span>
      {hint ? <span className="toggle-hint">{hint}</span> : null}
    </span>
    <span className="toggle-track" aria-hidden="true">
      <span className="toggle-thumb" />
    </span>
  </button>
);
