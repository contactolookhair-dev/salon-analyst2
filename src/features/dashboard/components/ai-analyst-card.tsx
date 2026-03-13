import { ArrowRight } from "lucide-react";

import { Card } from "@/shared/components/ui/card";

type AiAnalystCardProps = {
  branchName: string;
  profit: string;
};

export function AiAnalystCard({ branchName, profit }: AiAnalystCardProps) {
  return (
    <Card className="h-full bg-olive-950 text-white">
      <p className="text-sm uppercase tracking-[0.22em] text-white/50">
        Analista IA
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight">
        Insight inicial para {branchName}
      </h3>
      <p className="mt-4 text-sm leading-6 text-white/70">
        La utilidad actual muestra una lectura clara del día. En la siguiente fase
        podremos detectar caídas de margen, profesionales con mejor retorno y
        alertas de gasto atípico.
      </p>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
          Utilidad estimada
        </p>
        <p className="mt-2 text-3xl font-semibold">{profit}</p>
      </div>

      <button
        type="button"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white"
      >
        Ver recomendaciones futuras
        <ArrowRight className="size-4" />
      </button>
    </Card>
  );
}

