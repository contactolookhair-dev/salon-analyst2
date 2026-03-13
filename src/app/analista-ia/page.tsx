"use client";

import { AiAnalystSection } from "@/features/ai-analyst/components/ai-analyst-section";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";

export default function AnalistaIaPage() {
  const { branch } = useBranch();
  const { snapshot } = useBusinessSnapshot(branch);

  return (
    <AiAnalystSection
      context={{
        sales: snapshot.sales,
        expenses: snapshot.expenses,
        professionals: snapshot.professionals,
      }}
    />
  );
}
