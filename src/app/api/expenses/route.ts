import { NextResponse } from "next/server";

import {
  createExpenseInStorage,
  deleteExpenseInStorage,
  updateExpenseInStorage,
} from "@/server/database/business-repository";
import type {
  BranchId,
  ExpenseProrationMode,
  ExpenseType,
  PaymentStatus,
} from "@/shared/types/business";

export const runtime = "nodejs";

type ExpensePayload = {
  id?: string;
  name?: string;
  title?: string;
  amount?: number;
  type?: ExpenseType;
  active?: boolean;
  prorationMode?: ExpenseProrationMode;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  paymentNote?: string;
  paymentProofName?: string;
  paymentProofDataUrl?: string;
  dueDate?: string;
  branchId?: BranchId;
  category?: string;
  date?: string;
  time?: string;
  notes?: string;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeExpensePayload(body: ExpensePayload): {
  id: string;
  title: string;
  amount: number;
  type: ExpenseType;
  active: boolean;
  prorationMode?: ExpenseProrationMode;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paidDate: string;
  paymentMethod: string;
  paymentNote: string;
  paymentProofName: string;
  paymentProofDataUrl: string;
  dueDate: string;
  branchId: BranchId;
  category: string;
  date: string;
  time: string;
  notes: string;
} {
  return {
    id: safeString(body.id),
    title: safeString(body.title) || safeString(body.name),
    amount: safeNumber(body.amount),
    type: body.type === "fixed" ? "fixed" : "variable",
    active: body.active !== false,
    prorationMode:
      body.prorationMode === "operating_days" ? "operating_days" : "calendar_days",
    paymentStatus:
      body.paymentStatus === "paid"
        ? "paid"
        : body.paymentStatus === "partial"
          ? "partial"
          : "pending",
    paidAmount: safeNumber(body.paidAmount),
    paidDate: safeString(body.paidDate),
    paymentMethod: safeString(body.paymentMethod),
    paymentNote: safeString(body.paymentNote),
    paymentProofName: safeString(body.paymentProofName),
    paymentProofDataUrl: safeString(body.paymentProofDataUrl),
    dueDate: safeString(body.dueDate),
    branchId: safeString(body.branchId) as BranchId,
    category: safeString(body.category),
    date: safeString(body.date),
    time: safeString(body.time),
    notes: safeString(body.notes),
  };
}

function validateExpensePayload(
  payload: ReturnType<typeof normalizeExpensePayload>,
  requireId = false
) {
  if (requireId && !payload.id) {
    return "Falta identificar el gasto.";
  }

  if (!payload.title) {
    return "Falta nombre del gasto.";
  }

  if (!payload.amount || payload.amount <= 0) {
    return "El monto del gasto es inválido.";
  }

  if (!payload.branchId) {
    return "Falta sucursal.";
  }

  if (!payload.category) {
    return "Falta categoría.";
  }

  if (!payload.date) {
    return "Falta fecha.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExpensePayload;
    const payload = normalizeExpensePayload(body);
    const validationError = validateExpensePayload(payload);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const result = await createExpenseInStorage(payload);

    return NextResponse.json({
      success: true,
      message: "Gasto guardado correctamente.",
      expense: result.expense,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "No pude guardar el gasto.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ExpensePayload;
    const payload = normalizeExpensePayload(body);
    const validationError = validateExpensePayload(payload, true);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const result = await updateExpenseInStorage(payload as Parameters<typeof updateExpenseInStorage>[0]);

    return NextResponse.json({
      success: true,
      message: "Gasto actualizado correctamente.",
      expense: result.expense,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "No pude actualizar el gasto.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as ExpensePayload;
    const id = safeString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta identificar el gasto a eliminar.",
        },
        { status: 400 }
      );
    }

    await deleteExpenseInStorage({ id });

    return NextResponse.json({
      success: true,
      message: "Gasto eliminado correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "No pude eliminar el gasto.",
      },
      { status: 500 }
    );
  }
}
