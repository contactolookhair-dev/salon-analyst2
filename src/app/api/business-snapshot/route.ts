import { NextResponse } from "next/server";

import { getBusinessSnapshotFromStorage } from "@/server/database/business-repository";
import type { BranchFilter } from "@/shared/types/business";

export const runtime = "nodejs";

function normalizeBranchFilter(value: string | null): BranchFilter {
  return value === "house-of-hair" ||
    value === "look-hair-extensions" ||
    value === "all"
    ? value
    : "all";
}

function createEmptySnapshot(branch: BranchFilter) {
  return {
    branch,
    sales: [],
    expenses: [],
    professionals: [],
    advances: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branch = normalizeBranchFilter(searchParams.get("branch"));

  try {
    const snapshot = await getBusinessSnapshotFromStorage(branch);

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[api/business-snapshot] snapshot_failed", {
      branch,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      createEmptySnapshot(branch),
      { status: 200 }
    );
  }
}
