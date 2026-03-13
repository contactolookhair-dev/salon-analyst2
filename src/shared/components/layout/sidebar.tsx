"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartNoAxesCombined,
  LayoutGrid,
  Receipt,
  Settings,
  WalletCards,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/ventas", label: "Ventas", icon: WalletCards },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/estadisticas", label: "Estadísticas", icon: ChartNoAxesCombined },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/analista-ia", label: "Analista IA", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-[32px] border border-white/60 bg-olive-950 px-5 py-6 text-white shadow-panel">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-white/50">
          SalonAnalyst2
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Financial Control
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Plataforma base para análisis premium de salones.
        </p>
      </div>

      <nav className="mt-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-olive-950 shadow-soft"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">
          Estado
        </p>
        <p className="mt-2 text-lg font-semibold">Base inicial lista</p>
        <p className="mt-2 text-sm text-white/60">
          Estructura preparada para ventas, gastos, estadísticas e IA.
        </p>
      </div>
    </aside>
  );
}
