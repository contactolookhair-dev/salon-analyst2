import { NextResponse } from "next/server";

import {
  createProfessionalInStorage,
  deleteProfessionalInStorage,
  getProfessionalsFromStorage,
  updateProfessionalInStorage,
} from "@/server/database/business-repository";

export const runtime = "nodejs";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
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

export async function GET() {
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
      branchIds,
      primaryBranchId:
        body.primaryBranchId === "house-of-hair" ||
        body.primaryBranchId === "look-hair-extensions"
          ? body.primaryBranchId
          : branchIds[0] ?? null,
      active: safeBoolean(body.active, true),
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

    return NextResponse.json({ success: true, data: result.professional });
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
      branchIds,
      primaryBranchId:
        body.primaryBranchId === "house-of-hair" ||
        body.primaryBranchId === "look-hair-extensions"
          ? body.primaryBranchId
          : branchIds[0] ?? null,
      active: safeBoolean(body.active, true),
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

    return NextResponse.json({ success: true, data: result.professional });
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
