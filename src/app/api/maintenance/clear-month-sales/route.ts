import { NextResponse } from "next/server";

import { clearCurrentMonthSalesInStorage } from "@/server/database/business-repository";
import { parseMaintenanceRequest } from "@/app/api/maintenance/_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseMaintenanceRequest(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const result = await clearCurrentMonthSalesInStorage();

    console.info("[maintenance] clear_month_sales_completed", result);

    return NextResponse.json({
      success: true,
      message: "Ventas del mes actual eliminadas correctamente.",
      deletedSales: result.deletedSales,
      deletedOrphanServices: result.deletedOrphanServices,
      fallback: result.fallback,
    });
  } catch (error) {
    console.error("[maintenance] clear_month_sales_failed", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude vaciar las ventas del mes actual.",
      },
      { status: 500 }
    );
  }
}
