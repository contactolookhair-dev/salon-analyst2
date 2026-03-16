import { NextResponse } from "next/server";

import {
  createAdvanceInStorage,
  deleteAdvanceInStorage,
  getAdvancesFromStorage,
  updateAdvanceInStorage,
} from "@/server/database/business-repository";
import { getDbStatus } from "@/server/database/db-client";
import type { Advance, AdvanceType, BranchId } from "@/shared/types/business";

export const runtime = "nodejs";

function ensurePersistentDb() {
  const dbStatus = getDbStatus();

  if (!dbStatus.available || !dbStatus.persistent) {
    return NextResponse.json(
      {
        success: false,
        error:
          dbStatus.reason ??
          "No hay una base de datos persistente configurada para guardar movimientos.",
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

function safeBranchId(value: unknown): BranchId | null {
  return value === "house-of-hair" || value === "look-hair-extensions"
    ? value
    : null;
}

function safeAdvanceType(value: unknown): AdvanceType {
  if (value === "partner_withdrawal" || value === "other_discount") {
    return value;
  }

  return "advance";
}

function buildAdvance(body: Record<string, unknown>): Advance {
  const branchId = safeBranchId(body.branchId) ?? "house-of-hair";

  return {
    id: safeString(body.id) || crypto.randomUUID(),
    personId: safeString(body.personId),
    amount: safeNumber(body.amount),
    date: safeString(body.date) || new Date().toISOString().slice(0, 10),
    branchId,
    branch: branchId === "look-hair-extensions" ? "Look Hair Extensions" : "House Of Hair",
    note: safeString(body.note) || undefined,
    type: safeAdvanceType(body.type),
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
    const advances = await getAdvancesFromStorage();
    return NextResponse.json({ success: true, data: advances });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude cargar movimientos del equipo.",
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
    const branchId = safeBranchId(body.branchId);

    if (!safeString(body.personId) || !branchId || safeNumber(body.amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Faltan datos para registrar el movimiento." },
        { status: 400 }
      );
    }

    const result = await createAdvanceInStorage({
      personId: safeString(body.personId),
      amount: safeNumber(body.amount),
      date: safeString(body.date) || new Date().toISOString().slice(0, 10),
      branchId,
      note: safeString(body.note) || undefined,
      type: safeAdvanceType(body.type),
    });

    return NextResponse.json({
      success: true,
      data: result.advance ?? buildAdvance(body),
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude crear el movimiento.",
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
    const branchId = safeBranchId(body.branchId);
    const id = safeString(body.id);

    if (!id || !safeString(body.personId) || !branchId || safeNumber(body.amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Faltan datos para actualizar el movimiento." },
        { status: 400 }
      );
    }

    const result = await updateAdvanceInStorage({
      id,
      personId: safeString(body.personId),
      amount: safeNumber(body.amount),
      date: safeString(body.date) || new Date().toISOString().slice(0, 10),
      branchId,
      note: safeString(body.note) || undefined,
      type: safeAdvanceType(body.type),
    });

    return NextResponse.json({
      success: true,
      data: result.advance ?? buildAdvance(body),
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude actualizar el movimiento.",
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
    const id = safeString(body.id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta ID del movimiento." },
        { status: 400 }
      );
    }

    const result = await deleteAdvanceInStorage({ id });

    return NextResponse.json({
      success: true,
      deleted: result.deleted ?? false,
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude eliminar el movimiento.",
      },
      { status: 500 }
    );
  }
}
