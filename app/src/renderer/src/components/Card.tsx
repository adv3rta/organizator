import type { PropsWithChildren, ReactNode } from "react";

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export const Card = ({ title, subtitle, actions, className = "", children }: CardProps) => (
  <section className={`glass-card${className ? ` ${className}` : ""}`}>
    {(title || actions) && (
      <header className="card-header">
        <div>
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="card-actions">{actions}</div> : null}
      </header>
    )}
    {children}
  </section>
);
