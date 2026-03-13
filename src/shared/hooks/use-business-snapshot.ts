"use client";

import { useCallback, useEffect, useState } from "react";

import { getBusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import type { BranchFilter } from "@/shared/types/business";

export function useBusinessSnapshot(branch: BranchFilter) {
  const [snapshot, setSnapshot] = useState<BusinessSnapshot>(() =>
    getBusinessSnapshot(branch)
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
      setSnapshot(payload);
    } catch {
      setSnapshot(getBusinessSnapshot(branch));
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    snapshot,
    isLoading,
    refresh,
  };
}
