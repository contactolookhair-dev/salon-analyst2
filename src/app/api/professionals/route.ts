import { NextResponse } from "next/server";

import {
  createProfessionalInStorage,
  deleteProfessionalInStorage,
  getProfessionalsFromStorage,
  updateProfessionalInStorage,
} from "@/server/database/business-repository";
import { getDbStatus } from "@/server/database/db-client";
import type {
  Professional,
  ProfessionalPaymentMode,
} from "@/shared/types/business";

export const runtime = "nodejs";

function ensurePersistentDb() {
  const dbStatus = getDbStatus();

  if (!dbStatus.available || !dbStatus.persistent) {
    return NextResponse.json(
      {
        success: false,
        error:
          dbStatus.reason ??
          "No hay una base de datos persistente configurada para guardar trabajadores.",
      },
      { status: 503 }
    );
  }

  return null;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function safeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => safeString(item)).filter(Boolean);
}

function safePaymentMode(value: unknown): ProfessionalPaymentMode {
  if (
    value === "fixed_salary" ||
    value === "mixed" ||
    value === "partner_draw"
  ) {
    return value;
  }

  return "commission";
}

function safeBranchIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is "house-of-hair" | "look-hair-extensions" =>
      item === "house-of-hair" || item === "look-hair-extensions"
  );
}

function buildProfessionalResponse(body: Record<string, unknown>): Professional {
  const branchIds = safeBranchIds(body.branchIds);

  return {
    id: safeString(body.id) || safeString(body.name).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: safeString(body.name),
    role: safeString(body.role) || "Profesional",
    primaryRole: safeString(body.primaryRole) || safeString(body.role) || "Profesional",
    secondaryRoles: safeStringArray(body.secondaryRoles),
    branchIds,
    primaryBranchId:
      body.primaryBranchId === "house-of-hair" ||
      body.primaryBranchId === "look-hair-extensions"
        ? body.primaryBranchId
        : branchIds[0] ?? null,
    active: safeBoolean(body.active, true),
    paymentMode: safePaymentMode(body.paymentMode),
    monthlySalary: safeNumber(body.monthlySalary) || undefined,
    commissionsEnabled: safeBoolean(body.commissionsEnabled, true),
    commissionMode:
      body.commissionMode === "percentage" ||
      body.commissionMode === "fixed" ||
      body.commissionMode === "mixed" ||
      body.commissionMode === "none"
        ? body.commissionMode
        : "system_rules",
    commissionValue: safeNumber(body.commissionValue) || undefined,
    phone: safeString(body.phone) || undefined,
    emergencyPhone: safeString(body.emergencyPhone) || undefined,
    email: safeString(body.email) || undefined,
    documentId: safeString(body.documentId) || undefined,
    notes: safeString(body.notes) || undefined,
    avatarColor: safeString(body.avatarColor) || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const professionals = await getProfessionalsFromStorage();
    return NextResponse.json({ success: true, data: professionals });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude cargar los profesionales.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const branchIds = safeBranchIds(body.branchIds);

    if (!safeString(body.name)) {
      return NextResponse.json(
        { success: false, error: "Falta nombre del profesional." },
        { status: 400 }
      );
    }

    const result = await createProfessionalInStorage({
      name: safeString(body.name),
      role: safeString(body.role) || "Profesional",
      primaryRole: safeString(body.primaryRole) || safeString(body.role) || "Profesional",
      secondaryRoles: safeStringArray(body.secondaryRoles),
      branchIds,
      primaryBranchId:
        body.primaryBranchId === "house-of-hair" ||
        body.primaryBranchId === "look-hair-extensions"
          ? body.primaryBranchId
          : branchIds[0] ?? null,
      active: safeBoolean(body.active, true),
      paymentMode: safePaymentMode(body.paymentMode),
      monthlySalary: safeNumber(body.monthlySalary) || undefined,
      commissionsEnabled: safeBoolean(body.commissionsEnabled, true),
      commissionMode:
        body.commissionMode === "percentage" ||
        body.commissionMode === "fixed" ||
        body.commissionMode === "mixed" ||
        body.commissionMode === "none"
          ? body.commissionMode
          : "system_rules",
      commissionValue: safeNumber(body.commissionValue) || undefined,
      phone: safeString(body.phone) || undefined,
      emergencyPhone: safeString(body.emergencyPhone) || undefined,
      email: safeString(body.email) || undefined,
      documentId: safeString(body.documentId) || undefined,
      notes: safeString(body.notes) || undefined,
      avatarColor: safeString(body.avatarColor) || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.professional ?? buildProfessionalResponse(body),
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude crear el profesional.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const professionalId = safeString(body.id);
    const branchIds = safeBranchIds(body.branchIds);

    if (!professionalId) {
      return NextResponse.json(
        { success: false, error: "Falta ID del profesional." },
        { status: 400 }
      );
    }

    const result = await updateProfessionalInStorage({
      id: professionalId,
      name: safeString(body.name),
      role: safeString(body.role) || "Profesional",
      primaryRole: safeString(body.primaryRole) || safeString(body.role) || "Profesional",
      secondaryRoles: safeStringArray(body.secondaryRoles),
      branchIds,
      primaryBranchId:
        body.primaryBranchId === "house-of-hair" ||
        body.primaryBranchId === "look-hair-extensions"
          ? body.primaryBranchId
          : branchIds[0] ?? null,
      active: safeBoolean(body.active, true),
      paymentMode: safePaymentMode(body.paymentMode),
      monthlySalary: safeNumber(body.monthlySalary) || undefined,
      commissionsEnabled: safeBoolean(body.commissionsEnabled, true),
      commissionMode:
        body.commissionMode === "percentage" ||
        body.commissionMode === "fixed" ||
        body.commissionMode === "mixed" ||
        body.commissionMode === "none"
          ? body.commissionMode
          : "system_rules",
      commissionValue: safeNumber(body.commissionValue) || undefined,
      phone: safeString(body.phone) || undefined,
      emergencyPhone: safeString(body.emergencyPhone) || undefined,
      email: safeString(body.email) || undefined,
      documentId: safeString(body.documentId) || undefined,
      notes: safeString(body.notes) || undefined,
      avatarColor: safeString(body.avatarColor) || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.professional ?? buildProfessionalResponse(body),
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude actualizar el profesional.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const professionalId = safeString(body.id);

    if (!professionalId) {
      return NextResponse.json(
        { success: false, error: "Falta ID del profesional." },
        { status: 400 }
      );
    }

    const result = await deleteProfessionalInStorage({ id: professionalId });

    return NextResponse.json({
      success: true,
      data: result,
      fallback: result.fallback ?? false,
      message: "El trabajador fue desactivado para conservar su historial y comisiones.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude eliminar el profesional.",
      },
      { status: 500 }
    );
  }
}
