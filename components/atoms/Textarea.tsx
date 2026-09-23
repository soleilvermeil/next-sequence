"use client";

import {
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Grow min-height with content up to maxRows, while still stretching
   * to fill a taller parent (e.g. table row).
   */
  autoGrow?: boolean;
  maxRows?: number;
  compact?: boolean;
}

/** Match compact Input: text-sm + py-1 + 1px border. */
function measureSingleLineHeight(el: HTMLTextAreaElement): number {
  const cs = getComputedStyle(el);
  const lineHeight = parseFloat(cs.lineHeight) || 20;
  const paddingY =
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const borderY =
    (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
  return lineHeight + paddingY + borderY;
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

    const singleLine = measureSingleLineHeight(el);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;

    // Collapse to measure intrinsic content; empty/near-empty maps to input height.
    el.style.height = "0px";
    el.style.minHeight = "0px";
    el.style.overflowY = "hidden";
    const raw = el.scrollHeight;
    const contentHeight =
      raw <= singleLine + 3
        ? singleLine
        : Math.min(Math.max(raw, singleLine), maxHeight);

    el.style.minHeight = `${contentHeight}px`;
    el.style.height = "100%";
    el.style.overflowY = raw > maxHeight ? "auto" : "hidden";
  }, [value, autoGrow, maxRows]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      className={[
        "box-border h-full w-full resize-none rounded-md border border-transparent bg-transparent text-slate-800",
        "placeholder:text-slate-400",
        "hover:border-slate-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15",
        compact ? "px-1.5 py-1 text-sm leading-snug" : "px-2.5 py-1.5 text-sm leading-relaxed",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
