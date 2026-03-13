"use client";

import { ChevronDown, MapPin } from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import { useBranch } from "@/shared/context/branch-context";
import { cn } from "@/shared/lib/utils";

export function BranchSelector() {
  const { branch, setBranch } = useBranch();

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-olive-700" />
      <select
        aria-label="Seleccionar sucursal"
        className={cn(
          "w-full appearance-none rounded-2xl border border-white/60 bg-white/80 py-3 pl-11 pr-12 text-sm font-medium text-olive-950 shadow-soft backdrop-blur-sm outline-none transition",
          "hover:border-olive-700/20 focus:border-olive-700/40"
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
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-olive-700" />
    </div>
  );
}
