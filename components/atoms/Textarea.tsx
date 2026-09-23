"use client";

import {
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with content up to maxRows; otherwise stay single-line compact. */
  autoGrow?: boolean;
  maxRows?: number;
  compact?: boolean;
}

export function Textarea({
  className = "",
  autoGrow = true,
  maxRows = 6,
  compact = true,
  value,
  onChange,
  ...props
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !autoGrow) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, autoGrow, maxRows]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      className={[
        "w-full resize-none rounded-md border border-transparent bg-transparent text-slate-800",
        "placeholder:text-slate-400",
        "hover:border-slate-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15",
        compact ? "px-1.5 py-1 text-sm leading-snug" : "px-2.5 py-1.5 text-sm leading-relaxed",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
