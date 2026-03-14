"use client";

import { StatisticsOverview } from "@/features/statistics/components/statistics-overview";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";

export default function EstadisticasPage() {
  const { branch } = useBranch();
  const { snapshot } = useBusinessSnapshot(branch);

  return <StatisticsOverview snapshot={snapshot} />;
}
