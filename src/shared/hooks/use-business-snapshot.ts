"use client";

import { useCallback, useEffect, useState } from "react";

import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import { loadBrowserProfessionals, mergeProfessionals } from "@/features/team/lib/browser-professionals-storage";
import { subscribeBusinessSnapshotRefresh } from "@/shared/lib/business-snapshot-events";
import type { BranchFilter } from "@/shared/types/business";

function createEmptySnapshot(branch: BranchFilter): BusinessSnapshot {
  return {
    branch,
    sales: [],
    expenses: [],
    professionals: [],
  };
}

export function useBusinessSnapshot(branch: BranchFilter) {
  const [snapshot, setSnapshot] = useState<BusinessSnapshot>(() =>
    createEmptySnapshot(branch)
  );
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/business-snapshot?branch=${branch}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No pude cargar datos del negocio.");
      }

      const payload = (await response.json()) as BusinessSnapshot;
      const browserProfessionals = loadBrowserProfessionals().filter((professional) =>
        branch === "all" ? true : professional.branchIds.includes(branch)
      );

      setSnapshot({
        ...payload,
        professionals: mergeProfessionals(payload.professionals, browserProfessionals),
      });
    } catch {
      const browserProfessionals = loadBrowserProfessionals().filter((professional) =>
        branch === "all" ? true : professional.branchIds.includes(branch)
      );

      setSnapshot({
        ...createEmptySnapshot(branch),
        professionals: browserProfessionals,
      });
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeBusinessSnapshotRefresh(() => {
      void refresh();
    });
  }, [refresh]);

  return {
    snapshot,
    isLoading,
    refresh,
  };
}
