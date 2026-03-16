import { NextResponse } from "next/server";

import { getDbClient } from "@/server/database/db-client";
import {
  recordAlertDispatch,
  sendPushNotification,
  shouldSendAlertPush,
} from "@/server/notifications/push-service";

export const runtime = "nodejs";

function getSantiagoDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour") || "0"),
  };
}

function formatBranchLabel(branchPreference: string | null | undefined) {
  if (!branchPreference || branchPreference === "all") {
    return "todas las sucursales";
  }

  return branchPreference
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export async function GET() {
  try {
    const db = getDbClient();

    if (!db) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: true,
        reason: "db_unavailable",
      });
    }

    const now = getSantiagoDate();

    if (now.hour < 9 || now.hour > 22) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: true,
        reason: "outside_hour_window",
      });
    }

    const devices = await db.deviceToken.findMany({
      where: {
        active: true,
        hourlyReminders: true,
      },
    });

    if (devices.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: true,
        reason: "no_devices",
      });
    }

    let sent = 0;

    for (const device of devices) {
      const alertKey = `hourly-reminder:${now.year}-${now.month}-${now.day}-${now.hour}:${device.branchPreference ?? "all"}:${device.id}`;
      const canSend = await shouldSendAlertPush(alertKey, 50);

      if (!canSend) {
        continue;
      }

      const title = "SalonAnalyst2";
      const body = `Revision horaria activa para ${formatBranchLabel(device.branchPreference)}.`;

      const response = await sendPushNotification({
        token: device.token,
        title,
        body,
        url: "/",
      });

      if (!response.success && !response.skipped) {
        continue;
      }

      await recordAlertDispatch({
        alertKey,
        alertType: "hourly_reminder",
        branchId: device.branchPreference ?? undefined,
        severity: "info",
        title,
        body,
        deviceToken: device.token,
      });

      sent += response.skipped ? 0 : 1;
    }

    return NextResponse.json({
      success: true,
      sent,
      devices: devices.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude generar los recordatorios horarios.",
      },
      { status: 500 }
    );
  }
}

