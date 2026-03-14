"use client";

import { TeamOverview } from "@/features/team/components/team-overview";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";

export default function EquipoPage() {
  const { branch } = useBranch();
  const { snapshot } = useBusinessSnapshot(branch);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Equipo"
        title="Análisis del equipo"
        description="Control por profesional de ventas, comisiones acumuladas, adelantos, neto a pagar e historial del período."
      />
      <TeamOverview
        professionals={snapshot.professionals}
        sales={snapshot.sales}
      />
    </section>
  );
}
