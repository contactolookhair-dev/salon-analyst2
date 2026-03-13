"use client";

import { useEffect, useState, type PropsWithChildren } from "react";

type ChartShellProps = PropsWithChildren<{
  heightClassName?: string;
}>;

export function ChartShell({
  children,
  heightClassName = "h-[260px]",
}: ChartShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={heightClassName}>
      {mounted ? children : <div className="h-full rounded-2xl bg-[#f6f3eb]" />}
    </div>
  );
}

