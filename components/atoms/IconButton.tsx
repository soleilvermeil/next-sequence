import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger" | "muted";
}

const toneClass = {
  default: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "text-slate-500 hover:bg-red-50 hover:text-red-700",
  muted: "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
};

export function IconButton({
  label,
  children,
  tone = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30",
        "disabled:pointer-events-none disabled:opacity-35",
        toneClass[tone],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
