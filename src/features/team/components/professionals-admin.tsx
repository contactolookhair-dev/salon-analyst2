"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import {
  loadBrowserProfessionals,
  mergeProfessionals,
  removeBrowserProfessional,
  saveBrowserProfessionals,
  upsertBrowserProfessional,
} from "@/features/team/lib/browser-professionals-storage";
import { Card } from "@/shared/components/ui/card";
import { notifyBusinessSnapshotUpdated } from "@/shared/lib/business-snapshot-events";
import type { BranchId, Professional, ProfessionalCommissionMode } from "@/shared/types/business";

type ProfessionalsAdminProps = {
  initialProfessionals: Professional[];
};

type ProfessionalFormState = {
  id?: string;
  name: string;
  role: string;
  branchIds: BranchId[];
  primaryBranchId: BranchId | "";
  active: boolean;
  commissionMode: ProfessionalCommissionMode;
  commissionValue: number;
  phone: string;
  emergencyPhone: string;
  email: string;
  documentId: string;
  notes: string;
  avatarColor: string;
};

const emptyForm: ProfessionalFormState = {
  name: "",
  role: "Profesional",
  branchIds: [],
  primaryBranchId: "",
  active: true,
  commissionMode: "system_rules",
  commissionValue: 0,
  phone: "",
  emergencyPhone: "",
  email: "",
  documentId: "",
  notes: "",
  avatarColor: "#7c6f4f",
};

function createProfessionalFromForm(form: ProfessionalFormState): Professional {
  const normalizedId =
    form.id?.trim() ||
    form.name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return {
    id: normalizedId,
    name: form.name.trim(),
    role: form.role.trim() || "Profesional",
    branchIds: form.branchIds,
    primaryBranchId: form.primaryBranchId || form.branchIds[0] || null,
    active: form.active,
    commissionMode: form.commissionMode,
    commissionValue:
      form.commissionMode === "system_rules" || form.commissionMode === "none"
        ? undefined
        : form.commissionValue,
    phone: form.phone.trim() || undefined,
    emergencyPhone: form.emergencyPhone.trim() || undefined,
    email: form.email.trim() || undefined,
    documentId: form.documentId.trim() || undefined,
    notes: form.notes.trim() || undefined,
    avatarColor: form.avatarColor.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createFormFromProfessional(professional?: Professional | null): ProfessionalFormState {
  if (!professional) {
    return emptyForm;
  }

  return {
    id: professional.id,
    name: professional.name,
    role: professional.role,
    branchIds: professional.branchIds,
    primaryBranchId: professional.primaryBranchId ?? professional.branchIds[0] ?? "",
    active: professional.active,
    commissionMode: professional.commissionMode,
    commissionValue: professional.commissionValue ?? 0,
    phone: professional.phone ?? "",
    emergencyPhone: professional.emergencyPhone ?? "",
    email: professional.email ?? "",
    documentId: professional.documentId ?? "",
    notes: professional.notes ?? "",
    avatarColor: professional.avatarColor ?? "#7c6f4f",
  };
}

function upsertProfessional(items: Professional[], professional: Professional) {
  const nextItems = items.filter((item) => item.id !== professional.id);
  nextItems.push(professional);
  return mergeProfessionals(nextItems, []);
}

export function ProfessionalsAdmin({ initialProfessionals }: ProfessionalsAdminProps) {
  const [professionals, setProfessionals] = useState<Professional[]>(
    mergeProfessionals(initialProfessionals, [])
  );
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | BranchId>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ProfessionalFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfessionals((currentProfessionals) =>
      mergeProfessionals(
        mergeProfessionals(currentProfessionals, initialProfessionals),
        loadBrowserProfessionals()
      )
    );
  }, [initialProfessionals]);

  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          professionals
            .map((professional) => professional.role.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [professionals]
  );

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((professional) => {
      const matchesQuery =
        !query.trim() ||
        professional.name.toLowerCase().includes(query.toLowerCase()) ||
        professional.role.toLowerCase().includes(query.toLowerCase());
      const matchesBranch =
        branchFilter === "all" || professional.branchIds.includes(branchFilter);
      const matchesRole = roleFilter === "all" || professional.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? professional.active : !professional.active);

      return matchesQuery && matchesBranch && matchesRole && matchesStatus;
    });
  }, [professionals, query, branchFilter, roleFilter, statusFilter]);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setEditorOpen(true);
  }

  function openEdit(professional: Professional) {
    setForm(createFormFromProfessional(professional));
    setError(null);
    setEditorOpen(true);
  }

  async function refreshProfessionals() {
    const response = await fetch("/api/professionals", { cache: "no-store" });
    const payload = (await response.json()) as {
      success: boolean;
      data?: Professional[];
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "No pude cargar profesionales.");
    }

    const mergedProfessionals = mergeProfessionals(payload.data, loadBrowserProfessionals());
    setProfessionals(mergedProfessionals);
    notifyBusinessSnapshotUpdated();
  }

  async function handleSubmit() {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/professionals", {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          primaryBranchId: form.primaryBranchId || null,
          commissionValue:
            form.commissionMode === "system_rules" || form.commissionMode === "none"
              ? undefined
              : form.commissionValue,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: Professional;
        fallback?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude guardar el profesional.");
      }

      if (payload.data) {
        if (payload.fallback) {
          upsertBrowserProfessional(payload.data as Professional);
        } else {
          saveBrowserProfessionals(
            loadBrowserProfessionals().filter(
              (professional) => professional.id !== payload.data?.id
            )
          );
        }

        setProfessionals((currentProfessionals) =>
          mergeProfessionals(
            upsertProfessional(currentProfessionals, payload.data as Professional),
            loadBrowserProfessionals()
          )
        );
      }

      setQuery("");
      setBranchFilter("all");
      setRoleFilter("all");
      setStatusFilter("all");
      await refreshProfessionals();
      setEditorOpen(false);
      setForm(emptyForm);
    } catch (submitError) {
      const fallbackProfessional = createProfessionalFromForm(form);
      upsertBrowserProfessional(fallbackProfessional);
      setProfessionals((currentProfessionals) =>
        mergeProfessionals(
          upsertProfessional(currentProfessionals, fallbackProfessional),
          loadBrowserProfessionals()
        )
      );
      setQuery("");
      setBranchFilter("all");
      setRoleFilter("all");
      setStatusFilter("all");
      setEditorOpen(false);
      setForm(emptyForm);
      notifyBusinessSnapshotUpdated();
      setError(
        submitError instanceof Error
          ? `${submitError.message} Guardé este profesional localmente en este navegador para que puedas seguir trabajando.`
          : "No pude guardar en el servidor. El profesional quedó guardado localmente en este navegador."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(professional: Professional) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar a ${professional.name}? Si tiene historial, se desactivará en vez de borrarse.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/professionals", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: professional.id }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        fallback?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude eliminar el profesional.");
      }

      if (payload.fallback) {
        const nextLocalProfessionals = loadBrowserProfessionals().map((item) =>
          item.id === professional.id ? { ...item, active: false } : item
        );
        saveBrowserProfessionals(nextLocalProfessionals);
        setProfessionals((currentProfessionals) =>
          mergeProfessionals(
            currentProfessionals.map((item) =>
              item.id === professional.id ? { ...item, active: false } : item
            ),
            nextLocalProfessionals
          )
        );
        notifyBusinessSnapshotUpdated();
      } else {
        removeBrowserProfessional(professional.id);
        await refreshProfessionals();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No pude eliminar el profesional."
      );
    }
  }

  async function handleToggleActive(professional: Professional) {
    try {
      const response = await fetch("/api/professionals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createFormFromProfessional(professional),
          active: !professional.active,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: Professional;
        fallback?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude actualizar el estado.");
      }

      if (payload.data && payload.fallback) {
        upsertBrowserProfessional(payload.data);
        setProfessionals((currentProfessionals) =>
          mergeProfessionals(
            currentProfessionals.map((item) =>
              item.id === professional.id ? payload.data! : item
            ),
            loadBrowserProfessionals()
          )
        );
        notifyBusinessSnapshotUpdated();
      } else {
        if (payload.data) {
          saveBrowserProfessionals(
            loadBrowserProfessionals().map((item) =>
              item.id === professional.id ? payload.data! : item
            )
          );
        } else {
          removeBrowserProfessional(professional.id);
        }
        await refreshProfessionals();
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "No pude actualizar el estado."
      );
    }
  }

  function toggleBranch(branchId: BranchId) {
          setForm((current) => ({
            ...current,
            branchIds: current.branchIds.includes(branchId)
              ? current.branchIds.filter((item) => item !== branchId)
              : [...current.branchIds, branchId],
            primaryBranchId:
              current.primaryBranchId && current.primaryBranchId !== branchId
                ? current.primaryBranchId
                : branchId,
    }));
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-olive-950">Profesionales</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra instaladores, estilistas, coloristas y cualquier integrante del negocio sin dejar nombres fijos en el sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Nuevo profesional
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o cargo"
          className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
        />
        <select
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value as "all" | BranchId)}
          className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
        >
          <option value="all">Todas las sucursales</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
        >
          <option value="all">Todos los cargos</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | "active" | "inactive")
          }
          className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {editorOpen ? (
        <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-5">
          <div className="grid gap-3 xl:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Nombre completo</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Cargo / rol</span>
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Sucursal principal</span>
              <select
                value={form.primaryBranchId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryBranchId: event.target.value as BranchId | "",
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              >
                <option value="">General / sin principal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Estado</span>
              <select
                value={form.active ? "active" : "inactive"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.value === "active",
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Tipo de comisión</span>
              <select
                value={form.commissionMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    commissionMode: event.target.value as ProfessionalCommissionMode,
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              >
                <option value="system_rules">Usar reglas del sistema</option>
                <option value="percentage">Porcentaje fijo</option>
                <option value="fixed">Monto fijo</option>
                <option value="mixed">Mixto</option>
                <option value="none">Sin comisión</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Valor personalizado</span>
              <input
                type="number"
                min={0}
                value={form.commissionValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    commissionValue: Number(event.target.value) || 0,
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Teléfono</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Número de emergencia</span>
              <input
                value={form.emergencyPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, emergencyPhone: event.target.value }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">RUT o identificación</span>
              <input
                value={form.documentId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, documentId: event.target.value }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-olive-950">Email</span>
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm xl:col-span-2">
              <span className="font-medium text-olive-950">Notas internas</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-28 w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-olive-950">Sucursales</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => toggleBranch(branch.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    form.branchIds.includes(branch.id)
                      ? "bg-olive-950 text-white"
                      : "border border-olive-950/10 bg-white text-olive-950"
                  }`}
                >
                  {branch.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm text-olive-950">
              <span className="font-medium">Color / avatar</span>
              <input
                type="color"
                value={form.avatarColor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, avatarColor: event.target.value }))
                }
                className="h-10 w-16 rounded-xl border border-olive-950/10 bg-white"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  setForm(emptyForm);
                  setError(null);
                }}
                className="rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSaving || !form.name.trim() || form.branchIds.length === 0}
                className="rounded-full bg-olive-950 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(42,45,31,0.18)] disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : form.id ? "Guardar cambios" : "Guardar profesional"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredProfessionals.map((professional) => {
          const branchLabels = professional.branchIds
            .map((branchId) => branches.find((branch) => branch.id === branchId)?.name ?? branchId)
            .join(" · ");

          return (
            <div
              key={professional.id}
              className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-12 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: professional.avatarColor ?? "#7c6f4f" }}
                  >
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-olive-950">{professional.name}</p>
                    <p className="text-sm text-muted-foreground">{professional.role}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    professional.active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {professional.active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p>{branchLabels || "General"}</p>
                <p>Comisión: {professional.commissionMode}</p>
                {professional.phone ? <p>{professional.phone}</p> : null}
                {professional.emergencyPhone ? <p>Emergencia: {professional.emergencyPhone}</p> : null}
                {professional.email ? <p>{professional.email}</p> : null}
                {professional.documentId ? <p>ID: {professional.documentId}</p> : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(professional)}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
                >
                  <Pencil className="size-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(professional)}
                  className="rounded-full border border-olive-950/10 bg-white px-4 py-2 text-sm font-semibold text-olive-950"
                >
                  {professional.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(professional)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  <Trash2 className="size-4" />
                  Desactivar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
