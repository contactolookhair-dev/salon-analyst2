import { NextResponse } from "next/server";

import { getDbClient } from "@/server/database/db-client";

export const runtime = "nodejs";

function safeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function POST(request: Request) {
  try {
    const db = getDbClient();
    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Falta token del dispositivo." },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ success: true, offline: true });
    }

    await db.deviceToken.upsert({
      where: { token },
      create: {
        id: `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        token,
        provider: typeof body.provider === "string" ? body.provider : "local",
        deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel : null,
        branchPreference:
          typeof body.branchPreference === "string" ? body.branchPreference : null,
        active: true,
        alertCritical: safeBoolean(body.alertCritical, true),
        alertImportant: safeBoolean(body.alertImportant, true),
        alertPredictive: safeBoolean(body.alertPredictive, true),
        dailySummary: safeBoolean(body.dailySummary, false),
        soundEnabled: safeBoolean(body.soundEnabled, true),
      },
      update: {
        provider: typeof body.provider === "string" ? body.provider : "local",
        deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel : null,
        branchPreference:
          typeof body.branchPreference === "string" ? body.branchPreference : null,
        active: true,
        alertCritical: safeBoolean(body.alertCritical, true),
        alertImportant: safeBoolean(body.alertImportant, true),
        alertPredictive: safeBoolean(body.alertPredictive, true),
        dailySummary: safeBoolean(body.dailySummary, false),
        soundEnabled: safeBoolean(body.soundEnabled, true),
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude registrar el dispositivo.",
      },
      { status: 500 }
    );
  }
}
