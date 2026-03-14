import type { PropsWithChildren } from "react";

import { cn } from "@/shared/lib/utils";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <article
      className={cn(
        "rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-[var(--theme-card-shadow)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </article>
  );
}
