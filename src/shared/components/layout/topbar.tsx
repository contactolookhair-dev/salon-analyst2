"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";

import { BranchLogo } from "@/features/branches/components/branch-logo";
import { BranchSelector } from "@/features/branches/components/branch-selector";
import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import {
  BRANCH_CONFIG_UPDATED_EVENT,
  loadEditableBranches,
} from "@/features/branches/lib/branch-config-storage";
import { useBranch } from "@/shared/context/branch-context";

export function Topbar() {
  const { branch, theme } = useBranch();
  const [branchConfigs, setBranchConfigs] = useState(baseBranches);

  useEffect(() => {
    const syncBranches = () => setBranchConfigs(loadEditableBranches());

    syncBranches();
    window.addEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);

    return () => {
      window.removeEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);
    };
  }, []);

  const activeBranch = useMemo(
    () => (branch === "all" ? null : branchConfigs.find((item) => item.id === branch) ?? null),
    [branch, branchConfigs]
  );

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <BranchLogo branch={activeBranch} size="md" />
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--theme-header-eyebrow)]">
            Dashboard operativo
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--theme-text)]">
            Control financiero diario
          </h2>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-[var(--theme-text-muted)]">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: activeBranch?.primaryColor ?? theme.dotColor }}
              aria-hidden="true"
            />
            <span className="font-medium text-[var(--theme-text)]">
              {activeBranch?.name ?? theme.label}
            </span>
            <span>{theme.description}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-text-muted)] shadow-soft backdrop-blur-sm">
          <Search className="size-4 text-[var(--theme-header-eyebrow)]" />
          Buscar módulo
        </div>
        <div className="w-full min-w-[240px] sm:w-[280px]">
          <BranchSelector />
        </div>
        <button
          type="button"
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text)] shadow-soft backdrop-blur-sm transition hover:border-[var(--theme-accent)]/40"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
