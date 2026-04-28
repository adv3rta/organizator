import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "glass" | "primary" | "contrast" | "tile" | "icon";

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button = ({
  variant = "glass",
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`ui-button ui-button-${variant}${fullWidth ? " ui-button-full" : ""}${className ? ` ${className}` : ""}`}
    {...props}
  >
    {children}
  </button>
);
