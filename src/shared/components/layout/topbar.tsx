import { Bell, Search } from "lucide-react";

import { BranchSelector } from "@/features/branches/components/branch-selector";

export function Topbar() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-olive-700">
          Dashboard operativo
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-olive-950">
          Control financiero diario
        </h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-muted-foreground shadow-soft backdrop-blur-sm">
          <Search className="size-4 text-olive-700" />
          Buscar módulo
        </div>
        <div className="w-full min-w-[240px] sm:w-[280px]">
          <BranchSelector />
        </div>
        <button
          type="button"
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-olive-950 shadow-soft backdrop-blur-sm transition hover:border-olive-700/20"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}

