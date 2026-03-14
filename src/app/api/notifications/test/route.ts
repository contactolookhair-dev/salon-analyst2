import { NextResponse } from "next/server";

import { getDbClient } from "@/server/database/db-client";
import { sendPushNotification } from "@/server/notifications/push-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const db = getDbClient();
    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Falta token para probar la notificación." },
        { status: 400 }
      );
    }

    if (db) {
      await db.deviceToken.updateMany({
        where: { token },
        data: {
          lastSeenAt: new Date(),
        },
      });
    }

    const result = await sendPushNotification({
      token,
      title: "SalonAnalyst2",
      body: "Esta es una notificación de prueba del sistema.",
      url: "/configuracion",
    });

    return NextResponse.json({
      success: true,
      providerConfigured: !result.skipped,
      message: result.skipped
        ? "El dispositivo quedó registrado, pero falta FIREBASE_SERVER_KEY para enviar push reales desde el backend."
        : "Notificación de prueba enviada.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude enviar la notificación de prueba.",
      },
      { status: 500 }
    );
  }
}
