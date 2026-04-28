import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className = "", ...props }: InputProps) => (
  <label className="ui-field">
    {label ? <span className="ui-field-label">{label}</span> : null}
    <input className={`ui-input${className ? ` ${className}` : ""}`} {...props} />
  </label>
);
