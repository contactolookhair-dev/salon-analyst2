"use client";

import { ArrowUp, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function MobileQuickActions() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleScrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRefresh() {
    setIsPending(true);
    window.location.reload();
  }

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-50 flex flex-col gap-3 lg:hidden"
      aria-label="Acciones rapidas moviles"
    >
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        className="pointer-events-auto inline-flex min-h-12 items-center gap-2 self-end rounded-full border border-[var(--theme-border)] bg-[var(--theme-card-strong)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] shadow-[var(--theme-card-shadow)] transition hover:border-[var(--theme-accent)]/40 disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
        Recargar
      </button>

      <button
        type="button"
        onClick={handleScrollTop}
        className={`pointer-events-auto inline-flex min-h-12 items-center gap-2 self-end rounded-full border border-[var(--theme-border)] bg-[var(--theme-card-strong)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] shadow-[var(--theme-card-shadow)] transition hover:border-[var(--theme-accent)]/40 ${
          showScrollTop ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
      >
        <ArrowUp className="size-4" />
        Subir
      </button>
    </div>
  );
}
