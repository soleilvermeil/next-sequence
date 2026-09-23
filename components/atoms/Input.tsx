import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  compact?: boolean;
}

export function Input({ className = "", compact, ...props }: InputProps) {
  return (
    <input
      className={[
        "box-border w-full rounded-md border border-transparent bg-transparent text-slate-800",
        "placeholder:text-slate-400",
        "hover:border-slate-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15",
        compact ? "px-1.5 py-1 text-sm leading-snug" : "px-2.5 py-1.5 text-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
