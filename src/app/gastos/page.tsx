"use client";

import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import { formatCurrency } from "@/shared/lib/utils";

export default function GastosPage() {
  const { branch } = useBranch();
  const { snapshot } = useBusinessSnapshot(branch);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Gastos"
        title="Gastos filtrados por sucursal"
        description="Los egresos se combinan o separan automáticamente según el selector global."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {snapshot.expenses.map((expense) => (
          <Card key={expense.id}>
            <p className="text-lg font-semibold text-olive-950">{expense.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {expense.branch} · {expense.category} · {expense.createdAt}
            </p>
            <p className="mt-4 text-2xl font-semibold text-olive-950">
              {formatCurrency(expense.amount)}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
