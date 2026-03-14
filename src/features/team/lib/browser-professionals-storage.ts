"use client";

import type { BranchId, Professional } from "@/shared/types/business";

const BROWSER_PROFESSIONALS_STORAGE_KEY = "salon-analyst:browser-professionals";

function isBranchId(value: string): value is BranchId {
  return value === "house-of-hair" || value === "look-hair-extensions";
}

function normalizeProfessional(input: Partial<Professional> & Pick<Professional, "id" | "name">): Professional {
  const branchIds = Array.isArray(input.branchIds)
    ? input.branchIds.filter((item): item is BranchId => isBranchId(item))
    : [];
  const primaryBranchId =
    input.primaryBranchId && isBranchId(input.primaryBranchId)
      ? input.primaryBranchId
      : branchIds[0] ?? null;

  return {
    id: input.id,
    name: input.name,
    branchIds,
    role: input.role ?? "Profesional",
    primaryBranchId,
    active: typeof input.active === "boolean" ? input.active : true,
    commissionMode: input.commissionMode ?? "system_rules",
    commissionValue: input.commissionValue ?? undefined,
    phone: input.phone ?? undefined,
    emergencyPhone: input.emergencyPhone ?? undefined,
    email: input.email ?? undefined,
    documentId: input.documentId ?? undefined,
    notes: input.notes ?? undefined,
    avatarColor: input.avatarColor ?? undefined,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function sortProfessionals(items: Professional[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

export function loadBrowserProfessionals(): Professional[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(BROWSER_PROFESSIONALS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as Array<Partial<Professional> & Pick<Professional, "id" | "name">>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortProfessionals(parsed.map(normalizeProfessional));
  } catch {
    return [];
  }
}

export function saveBrowserProfessionals(items: Professional[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BROWSER_PROFESSIONALS_STORAGE_KEY,
    JSON.stringify(sortProfessionals(items))
  );
}

export function mergeProfessionals(primary: Professional[], secondary: Professional[]) {
  const merged = new Map<string, Professional>();

  primary.forEach((professional) => {
    merged.set(professional.id, normalizeProfessional(professional));
  });

  secondary.forEach((professional) => {
    merged.set(professional.id, normalizeProfessional(professional));
  });

  return sortProfessionals(Array.from(merged.values()));
}

export function upsertBrowserProfessional(professional: Professional) {
  const nextItems = mergeProfessionals(loadBrowserProfessionals(), [professional]);
  saveBrowserProfessionals(nextItems);
  return nextItems;
}

export function removeBrowserProfessional(professionalId: string) {
  const nextItems = loadBrowserProfessionals().filter(
    (professional) => professional.id !== professionalId
  );
  saveBrowserProfessionals(nextItems);
  return nextItems;
}
