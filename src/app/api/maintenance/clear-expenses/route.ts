import { NextResponse } from "next/server";

import { clearAllExpensesInStorage } from "@/server/database/business-repository";
import { parseMaintenanceRequest } from "@/app/api/maintenance/_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseMaintenanceRequest(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const result = await clearAllExpensesInStorage();

    console.info("[maintenance] clear_expenses_completed", result);

    return NextResponse.json({
      success: true,
      message: "Todos los gastos fueron eliminados correctamente.",
      deletedExpenses: result.deletedExpenses,
      fallback: result.fallback,
    });
  } catch (error) {
    console.error("[maintenance] clear_expenses_failed", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude eliminar los gastos.",
      },
      { status: 500 }
    );
  }
}
