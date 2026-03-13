import { NextResponse } from "next/server";

import { getBusinessSnapshotFromStorage } from "@/server/database/business-repository";
import type { BranchFilter } from "@/shared/types/business";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = (searchParams.get("branch") ?? "all") as BranchFilter;
    const snapshot = await getBusinessSnapshotFromStorage(branch);

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pude cargar el snapshot del negocio.",
      },
      { status: 500 }
    );
  }
}

