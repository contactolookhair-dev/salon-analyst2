"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";

import { ProfessionalsAdmin } from "@/features/team/components/professionals-admin";
import { TeamOverview } from "@/features/team/components/team-overview";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";

export default function EquipoPage() {
  const { branch } = useBranch();
  const { snapshot, refresh } = useBusinessSnapshot(branch);
  const [showPersonnelAdmin, setShowPersonnelAdmin] = useState(false);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeading
          eyebrow="Equipo"
          title="Análisis del equipo"
          description="Control por profesional de ventas, comisiones acumuladas, adelantos, neto a pagar e historial del período."
        />
        <button
          type="button"
          onClick={() => setShowPersonnelAdmin((current) => !current)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white"
        >
          {showPersonnelAdmin ? <Users className="size-4" /> : <Plus className="size-4" />}
          {showPersonnelAdmin ? "Cerrar ingreso de personal" : "Ingresar personal"}
        </button>
      </div>

      {showPersonnelAdmin ? (
        <ProfessionalsAdmin initialProfessionals={snapshot.professionals} />
      ) : null}

      <TeamOverview
        professionals={snapshot.professionals}
        sales={snapshot.sales}
        onRegistered={() => void refresh()}
      />
    </section>
  );
}
