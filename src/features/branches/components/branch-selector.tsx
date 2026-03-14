"use client";

import { ChevronDown, MapPin } from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import { useBranch } from "@/shared/context/branch-context";
import { cn } from "@/shared/lib/utils";

export function BranchSelector() {
  const { branch, setBranch } = useBranch();

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--theme-header-eyebrow)]" />
      <select
        aria-label="Seleccionar sucursal"
        className={cn(
          "w-full appearance-none rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] py-3 pl-11 pr-12 text-sm font-medium text-[var(--theme-text)] shadow-soft backdrop-blur-sm outline-none transition",
          "hover:border-[var(--theme-accent)]/35 focus:border-[var(--theme-accent)]/45"
        )}
        value={branch}
        onChange={(event) => setBranch(event.target.value as typeof branch)}
      >
        <option value="all">Todas las sucursales</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--theme-header-eyebrow)]" />
    </div>
  );
}
