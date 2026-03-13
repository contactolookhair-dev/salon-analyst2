import { NextResponse } from "next/server";

import { createSaleInStorage } from "@/server/database/business-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date: string;
      branch: string;
      professional: string;
      service: string;
      total: number;
      clientName?: string;
    };

    const result = await createSaleInStorage(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pude registrar la venta.",
      },
      { status: 500 }
    );
  }
}

