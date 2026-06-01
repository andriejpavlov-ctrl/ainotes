"use client";

import { forwardRef } from "react";

type Variant = "ghost" | "outline" | "primary" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center rounded transition-colors disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  ghost: "text-muted hover:bg-surface2 hover:text-ink",
  outline: "border border-line bg-surface text-ink hover:bg-surface2",
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  danger: "text-muted hover:bg-danger/10 hover:text-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-control w-control",
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", active = false, className = "", ...props },
  ref,
) {
  const activeCls = active ? "bg-accent text-accent-ink hover:bg-accent-strong" : variants[variant];
  return <button ref={ref} className={`${base} ${activeCls} ${sizes[size]} ${className}`} {...props} />;
});

export default IconButton;
