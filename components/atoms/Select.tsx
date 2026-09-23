import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { value: string; label: string }[];
  compact?: boolean;
  placeholder?: string;
}

export function Select({
  options,
  className = "",
  compact,
  placeholder,
  ...props
}: SelectProps) {
  return (
    <select
      className={[
        "w-full rounded-md border border-transparent bg-transparent text-slate-800",
        "hover:border-slate-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15",
        compact ? "px-1 py-1 text-sm" : "px-2.5 py-1.5 text-sm",
        className,
      ].join(" ")}
      {...props}
    >
      {placeholder !== undefined && (
        <option value="">{placeholder}</option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
