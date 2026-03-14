"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/shared/components/ui/section-heading";
import { Card } from "@/shared/components/ui/card";
import { ProfessionalsAdmin } from "@/features/team/components/professionals-admin";
import {
  catalogItems,
  normalizeCatalogName,
  type CatalogItem,
} from "@/features/configuration/data/business-rules";
import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import {
  loadEditableBranches,
  saveEditableBranches,
} from "@/features/branches/lib/branch-config-storage";
import {
  countOperatingDaysInMonth,
  getDailyTarget,
} from "@/shared/lib/branch-operations";
import {
  loadEditableCatalog,
  saveEditableCatalog,
} from "@/features/configuration/lib/catalog-storage";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import type { Branch } from "@/shared/types/business";

export default function ConfiguracionPage() {
  const { snapshot } = useBusinessSnapshot("all");
  const [items, setItems] = useState<CatalogItem[]>(catalogItems);
  const [branchConfigs, setBranchConfigs] = useState<Branch[]>(baseBranches);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CatalogItem["tipo"]>("all");

  useEffect(() => {
    setItems(loadEditableCatalog());
    setBranchConfigs(loadEditableBranches());
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeCatalogName(query);

    if (!normalizedQuery) {
      return items.filter((item) => typeFilter === "all" || item.tipo === typeFilter);
    }

    return items.filter(
      (item) =>
        (typeFilter === "all" || item.tipo === typeFilter) &&
        (item.nombre.toLowerCase().includes(query.toLowerCase()) ||
          item.nombre_normalizado.includes(normalizedQuery))
    );
  }, [items, query, typeFilter]);

  const hiddenDuplicateCount = useMemo(
    () => items.filter((item) => item.deduplicado_interno).length,
    [items]
  );
  const similarNameIds = useMemo(() => {
    const nameMap = new Map<string, string[]>();

    items.forEach((item) => {
      const key = normalizeCatalogName(item.nombre);
      const bucket = nameMap.get(key) ?? [];
      bucket.push(item.id);
      nameMap.set(key, bucket);
    });

    return new Set(
      Array.from(nameMap.values())
        .filter((group) => group.length > 1)
        .flat()
    );
  }, [items]);
  const incompleteCount = useMemo(
    () => items.filter((item) => item.estado_configuracion === "incompleto").length,
    [items]
  );

  function withComputedStatus(item: CatalogItem): CatalogItem {
    return {
      ...item,
      activo: item.active,
      tipo_comision:
        item.commission_type === "percentage"
          ? "porcentaje"
          : item.commission_type === "fixed"
            ? "monto_fijo"
            : "sin_comision",
      valor_comision: item.commission_value,
      estado_configuracion:
        item.precio_venta_bruto > 0 &&
        item.costo > 0 &&
        (item.commission_type === "none" || item.commission_value > 0)
          ? "completo"
          : "incompleto",
    };
  }

  function updateItem(itemId: string, updater: (item: CatalogItem) => CatalogItem) {
    setItems((currentItems) => {
      const nextItems = currentItems.map((item) =>
        item.id === itemId ? withComputedStatus(updater(item)) : item
      );
      saveEditableCatalog(nextItems);
      return nextItems;
    });
  }

  function updateBranch(branchId: Branch["id"], updater: (branch: Branch) => Branch) {
    setBranchConfigs((currentBranches) => {
      const nextBranches = currentBranches.map((branch) =>
        branch.id === branchId ? updater(branch) : branch
      );
      saveEditableBranches(nextBranches);
      return nextBranches;
    });
  }

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Configuración"
        title="Servicios y productos"
        description="Catálogo maestro editable para matching de boletas, ventas manuales, costos y comisiones."
      />

      <ProfessionalsAdmin initialProfessionals={snapshot.professionals} />

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-olive-950">
            Configuración por sucursal
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Define días operativos, meta mensual y cómo prorratear gastos fijos para cada sucursal.
          </p>
        </div>

        <div className="space-y-3">
          {branchConfigs.map((branch) => {
            const branchDate = new Date(Date.UTC(2026, 2, 14, 12, 0, 0));
            const operatingDays = countOperatingDaysInMonth(branch, branchDate);
            const dailyTarget = getDailyTarget(branch, branchDate);

            return (
              <div
                key={branch.id}
                className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4"
              >
                <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr]">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-olive-950">Sucursal</span>
                    <input
                      value={branch.name}
                      onChange={(event) =>
                        updateBranch(branch.id, (currentBranch) => ({
                          ...currentBranch,
                          name: event.target.value as Branch["name"],
                        }))
                      }
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-olive-950">Meta mensual</span>
                    <input
                      type="number"
                      min={0}
                      value={branch.monthlyTarget}
                      onChange={(event) =>
                        updateBranch(branch.id, (currentBranch) => ({
                          ...currentBranch,
                          monthlyTarget: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-olive-950">Gastos fijos mensuales</span>
                    <input
                      type="number"
                      min={0}
                      value={branch.fixedMonthlyExpenses}
                      onChange={(event) =>
                        updateBranch(branch.id, (currentBranch) => ({
                          ...currentBranch,
                          fixedMonthlyExpenses: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-olive-950">Prorrateo fijo</span>
                    <select
                      value={branch.fixedExpenseProrationMode}
                      onChange={(event) =>
                        updateBranch(branch.id, (currentBranch) => ({
                          ...currentBranch,
                          fixedExpenseProrationMode:
                            event.target.value as Branch["fixedExpenseProrationMode"],
                        }))
                      }
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                    >
                      <option value="calendar_days">Días calendario</option>
                      <option value="operating_days">Días operativos</option>
                    </select>
                  </label>
                  <div className="space-y-2 text-sm">
                    <span className="font-medium text-olive-950">Estado</span>
                    <div className="rounded-2xl border border-olive-950/10 bg-white px-4 py-3">
                      <p className="font-medium text-olive-950">
                        {operatingDays} días operativos
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Meta diaria: ${dailyTarget.toLocaleString("es-CL")}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          updateBranch(branch.id, (currentBranch) => ({
                            ...currentBranch,
                            active: !currentBranch.active,
                          }))
                        }
                        className="mt-2 text-xs font-semibold text-olive-700"
                      >
                        {branch.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={`${branch.id}-${day}`}
                      type="button"
                      onClick={() =>
                        updateBranch(branch.id, (currentBranch) => ({
                          ...currentBranch,
                          openDays: currentBranch.openDays.includes(day)
                            ? currentBranch.openDays.filter((value) => value !== day)
                            : [...currentBranch.openDays, day].sort((a, b) => a - b),
                          operatesOnSundays:
                            day === 0
                              ? !currentBranch.openDays.includes(0)
                              : currentBranch.operatesOnSundays,
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        branch.openDays.includes(day)
                          ? "bg-olive-950 text-white"
                          : "border border-olive-950/10 bg-white text-olive-950"
                      }`}
                    >
                      {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"][day]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-olive-950">
              Catálogo maestro inicial
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Busca por nombre original o normalizado. Si un servicio se desactiva, no se borra: solo queda inactivo.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o nombre normalizado"
            className="w-full max-w-sm rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { label: "Todos", value: "all" },
            { label: "Servicios", value: "service" },
            { label: "Productos", value: "product" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                typeFilter === option.value
                  ? "bg-olive-950 text-white"
                  : "border border-olive-950/10 bg-white text-olive-950"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-olive-950/8 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {hiddenDuplicateCount > 0
            ? `No hay duplicados visibles en la tabla. Se consolidaron ${hiddenDuplicateCount} registros con duplicado exacto como referencia interna.`
            : "No hay duplicados visibles en la tabla actual."}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-olive-950/8 bg-white/80 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Duplicados exactos ocultos</p>
            <p className="mt-1 font-semibold text-olive-950">{hiddenDuplicateCount}</p>
          </div>
          <div className="rounded-2xl border border-olive-950/8 bg-white/80 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Nombres muy parecidos</p>
            <p className="mt-1 font-semibold text-olive-950">{similarNameIds.size}</p>
          </div>
          <div className="rounded-2xl border border-olive-950/8 bg-white/80 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Items incompletos</p>
            <p className="mt-1 font-semibold text-olive-950">{incompleteCount}</p>
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4"
            >
              <div className="grid gap-3 xl:grid-cols-[2.2fr_1.2fr_1fr_1fr_1fr_1fr_1fr_0.9fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-olive-950">Nombre</label>
                  <input
                    value={item.nombre}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        nombre: event.target.value,
                        nombre_normalizado: normalizeCatalogName(event.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Normalizado: {item.nombre_normalizado}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {similarNameIds.has(item.id) ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                        Nombre parecido
                      </span>
                    ) : null}
                    {item.estado_configuracion === "incompleto" ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-900">
                        Incompleto
                      </span>
                    ) : null}
                  </div>
                </div>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Categoría</span>
                  <input
                    value={item.categoria}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        categoria: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Tipo</span>
                  <select
                    value={item.tipo}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        tipo: event.target.value as CatalogItem["tipo"],
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  >
                    <option value="service">servicio</option>
                    <option value="product">producto</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Precio bruto</span>
                  <input
                    type="number"
                    min={0}
                    value={item.precio_venta_bruto}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        precio_venta_bruto: Number(event.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Costo</span>
                  <input
                    type="number"
                    min={0}
                    value={item.costo}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        costo: Number(event.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Comisión</span>
                  <input
                    type="number"
                    min={0}
                    value={item.commission_value}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        commission_value: Number(event.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Tipo comisión</span>
                  <select
                    value={item.commission_type}
                    onChange={(event) =>
                      updateItem(item.id, (currentItem) => ({
                        ...currentItem,
                        commission_type: event.target.value as CatalogItem["commission_type"],
                      }))
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                    <option value="none">Sin comisión</option>
                  </select>
                </label>
                <div className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Estado</span>
                  <div className="rounded-2xl border border-olive-950/10 bg-white px-4 py-3">
                    <p className="font-medium text-olive-950">{item.estado_configuracion}</p>
                    {item.nombre === "Extension adhesivas #1b" ? (
                      <p className="mt-1 text-xs font-semibold text-olive-700">
                        Comisión fija validada: $500
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(item.id, (currentItem) => ({
                          ...currentItem,
                          active: !currentItem.active,
                        }))
                      }
                      className="mt-2 text-xs font-semibold text-olive-700"
                    >
                      {item.active ? "Marcar inactivo" : "Reactivar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
