import Link from "next/link";
import { ArrowRight, Receipt, Settings, Sparkles, Users, WalletCards } from "lucide-react";

import { Card } from "@/shared/components/ui/card";

const quickLinks = [
  {
    href: "/ventas",
    label: "Registrar venta",
    description: "Escaneo de boleta y registro manual.",
    icon: WalletCards,
  },
  {
    href: "/gastos",
    label: "Gestionar gastos",
    description: "Variables, fijos y recurrentes.",
    icon: Receipt,
  },
  {
    href: "/equipo",
    label: "Ver equipo",
    description: "Comisiones, neto a pagar e historial.",
    icon: Users,
  },
  {
    href: "/estadisticas",
    label: "Ir a estadísticas",
    description: "Tendencias, comparativas y proyecciones.",
    icon: Sparkles,
  },
  {
    href: "/configuracion",
    label: "Abrir configuración",
    description: "Catálogo, sucursales y profesionales.",
    icon: Settings,
  },
];

export function QuickAccessCard() {
  return (
    <Card className="h-full">
      <div>
        <p className="text-sm text-muted-foreground">Accesos rápidos</p>
        <h3 className="mt-1 text-xl font-semibold text-olive-950">
          Atajos operativos
        </h3>
      </div>

      <div className="mt-6 grid gap-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 transition hover:border-[var(--theme-accent)]/30 hover:bg-[var(--theme-card-strong)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[var(--theme-accent)]/12 p-3 text-[var(--theme-accent)]">
                      <Icon className="size-4" />
                    </div>
                    <p className="font-semibold text-olive-950">{item.label}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--theme-accent)]" />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
