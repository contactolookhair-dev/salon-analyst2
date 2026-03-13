import type { PropsWithChildren } from "react";

import { cn } from "@/shared/lib/utils";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <article
      className={cn(
        "rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-panel backdrop-blur-xl",
        className
      )}
    >
      {children}
    </article>
  );
}

