import { NextResponse } from "next/server";

import { analyzeBusinessAlerts } from "@/features/business-alerts/lib/business-alerts-engine";
import { getBusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import { getBusinessSnapshotFromStorage } from "@/server/database/business-repository";
import { getDbClient } from "@/server/database/db-client";
import { recordAlertDispatch, sendPushNotification, shouldSendAlertPush } from "@/server/notifications/push-service";
import type { BranchFilter } from "@/shared/types/business";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let branch: BranchFilter = "all";

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    branch =
      body.branch === "house-of-hair" ||
      body.branch === "look-hair-extensions" ||
      body.branch === "all"
        ? (body.branch as BranchFilter)
        : "all";
    let snapshot;

    try {
      snapshot = await getBusinessSnapshotFromStorage(branch);
    } catch (error) {
      console.error("[api/alerts/dispatch] snapshot_failed", {
        branch,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      snapshot = getBusinessSnapshot(branch);
    }

    const { current, predictive } = analyzeBusinessAlerts(snapshot, branch);
    const allAlerts = [...current, ...predictive].filter(
      (alert) => alert.shouldPush && (alert.severity === "critical" || alert.severity === "warning")
    );
    const db = getDbClient();

    if (!db || allAlerts.length === 0) {
      return NextResponse.json({ success: true, sent: 0, alerts: allAlerts.length });
    }

    const devices = await db.deviceToken.findMany({
      where: {
        active: true,
      },
    });

    let sent = 0;

    for (const alert of allAlerts) {
      const alertKey = `${alert.type}:${alert.branch ?? "all"}:${alert.professional ?? "global"}`;
      const canSend = await shouldSendAlertPush(alertKey);

      if (!canSend) {
        continue;
      }

      for (const device of devices) {
        const acceptsSeverity =
          alert.severity === "critical"
            ? device.alertCritical
            : device.alertImportant;
        const acceptsPredictive = alert.isPredictive ? device.alertPredictive : true;

        if (!acceptsSeverity || !acceptsPredictive) {
          continue;
        }

        const response = await sendPushNotification({
          token: device.token,
          title: alert.pushTitle ?? alert.title,
          body: alert.pushBody ?? alert.message,
          url: "/",
        });

        if (!response.success && !response.skipped) {
          continue;
        }

        await recordAlertDispatch({
          alertKey,
          alertType: alert.type,
          branchId: typeof alert.branch === "string" ? alert.branch : undefined,
          severity: alert.severity,
          title: alert.pushTitle ?? alert.title,
          body: alert.pushBody ?? alert.message,
          deviceToken: device.token,
        });
        sent += response.skipped ? 0 : 1;
      }
    }

    return NextResponse.json({ success: true, sent, alerts: allAlerts.length });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude procesar el despacho de alertas.",
      },
      { status: 200 }
    );
  }
}
