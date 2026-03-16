"use client";

import { SalesEntryWorkspace } from "@/features/sales-register/components/sales-entry-workspace";
import { TeamOverview } from "@/features/team/components/team-overview";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";

export default function VentasPage() {
  const { branch } = useBranch();
  const { snapshot, refresh } = useBusinessSnapshot(branch);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Ventas"
        title="Registro y auditoría de ventas"
        description="Escanea boletas o registra ventas manualmente con autocompletado de catálogo y cálculo financiero en tiempo real."
      />
      <SalesEntryWorkspace
        professionals={snapshot.professionals}
        onRegistered={() => void refresh()}
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Equipo"
          title="Ventas por trabajador"
          description="Revisa ventas, comisiones, adelantos, neto a pagar e historial por profesional sin salir del módulo de ventas."
        />
        <TeamOverview
          professionals={snapshot.professionals}
          sales={snapshot.sales}
          advances={snapshot.advances}
          onRegistered={() => void refresh()}
          initialRangeMode="latest-sales-month"
        />
      </section>
    </section>
  );
}
