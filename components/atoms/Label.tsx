import type { ReactNode } from "react";

export function Label({
  children,
  htmlFor,
  className = "",
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-xs font-medium uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </label>
  );
}
