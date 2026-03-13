"use client";

import { ReceiptUploader } from "@/features/receipt-parser/components/receipt-uploader";
import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import { formatCurrency } from "@/shared/lib/utils";

export default function VentasPage() {
  const { branch } = useBranch();
  const { snapshot, refresh } = useBusinessSnapshot(branch);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Ventas"
        title="Ventas filtradas por sucursal"
        description="La tabla responde al selector global y combina resultados cuando estás viendo todas las sucursales."
      />
      <ReceiptUploader onRegistered={() => void refresh()} />
      <div className="grid gap-4">
        {snapshot.sales.map((sale) => (
          <Card key={sale.id} className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <p className="text-lg font-semibold text-olive-950">{sale.service}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sale.branch} · {sale.clientName} · {sale.createdAt}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Profesional
              </p>
              <p className="mt-2 font-semibold text-olive-950">{sale.professionalId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Bruto
              </p>
              <p className="mt-2 font-semibold text-olive-950">
                {formatCurrency(sale.grossAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Neto
              </p>
              <p className="mt-2 font-semibold text-olive-950">
                {formatCurrency(sale.netAmount)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
