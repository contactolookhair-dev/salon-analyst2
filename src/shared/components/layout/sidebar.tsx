"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartNoAxesCombined,
  LayoutGrid,
  Users,
  Receipt,
  Settings,
  WalletCards,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/ventas", label: "Ventas", icon: WalletCards },
  { href: "/equipo", label: "Equipo", icon: Users },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/estadisticas", label: "Estadísticas", icon: ChartNoAxesCombined },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/analista-ia", label: "Analista IA", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-[32px] border border-[var(--theme-border)] bg-[var(--theme-sidebar-bg)] px-5 py-6 text-[var(--theme-sidebar-text)] shadow-[var(--theme-shell-shadow)] transition-colors">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--theme-sidebar-muted)]">
          SalonAnalyst2
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Financial Control
        </h2>
        <p className="mt-2 text-sm text-[var(--theme-sidebar-muted)]">
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
                  ? "bg-[var(--theme-sidebar-active-bg)] text-[var(--theme-sidebar-active-text)] shadow-soft"
                  : "text-[var(--theme-sidebar-muted)] hover:bg-white/10 hover:text-[var(--theme-sidebar-text)]"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--theme-sidebar-muted)]">
          Estado
        </p>
        <p className="mt-2 text-lg font-semibold">Base inicial lista</p>
        <p className="mt-2 text-sm text-[var(--theme-sidebar-muted)]">
          Estructura preparada para ventas, gastos, estadísticas e IA.
        </p>
      </div>
    </aside>
  );
}
