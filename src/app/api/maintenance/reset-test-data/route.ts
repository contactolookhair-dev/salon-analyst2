import { NextResponse } from "next/server";

import { resetTestDataInStorage } from "@/server/database/business-repository";
import { parseMaintenanceRequest } from "@/app/api/maintenance/_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseMaintenanceRequest(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const result = await resetTestDataInStorage();

    console.info("[maintenance] reset_test_data_completed", result);

    return NextResponse.json({
      success: true,
      message: "Los datos operativos de prueba fueron reiniciados correctamente.",
      deletedSales: result.deletedSales,
      deletedExpenses: result.deletedExpenses,
      deletedAlerts: result.deletedAlerts,
      deletedOrphanServices: result.deletedOrphanServices,
      fallback: result.fallback,
    });
  } catch (error) {
    console.error("[maintenance] reset_test_data_failed", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude reiniciar los datos de prueba.",
      },
      { status: 500 }
    );
  }
}
