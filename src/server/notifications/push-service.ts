import { getDbClient } from "@/server/database/db-client";

type PushPayload = {
  token: string;
  title: string;
  body: string;
  url?: string;
};

export async function sendPushNotification(payload: PushPayload) {
  const serverKey = process.env.FIREBASE_SERVER_KEY;

  if (!serverKey) {
    return {
      success: false,
      skipped: true,
      reason: "missing_firebase_server_key",
    };
  }

  let response: Response;

  try {
    response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: payload.url ?? "/",
        },
      }),
    });
  } catch (error) {
    return {
      success: false,
      skipped: true,
      reason:
        error instanceof Error ? `network_error_${error.message}` : "network_error_unknown",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      skipped: false,
      reason: `fcm_error_${response.status}`,
    };
  }

  return {
    success: true,
    skipped: false,
  };
}

export async function shouldSendAlertPush(alertKey: string, windowMinutes = 120) {
  const db = getDbClient();

  if (!db) {
    return true;
  }

  const lastDispatch = await db.alertDispatch.findFirst({
    where: { alertKey },
    orderBy: { sentAt: "desc" },
  });

  if (!lastDispatch) {
    return true;
  }

  const minutesSinceLastSend =
    (Date.now() - lastDispatch.sentAt.getTime()) / (1000 * 60);

  return minutesSinceLastSend >= windowMinutes;
}

export async function recordAlertDispatch(input: {
  alertKey: string;
  alertType: string;
  branchId?: string;
  severity: string;
  title: string;
  body: string;
  deviceToken?: string;
}) {
  const db = getDbClient();

  if (!db) {
    return;
  }

  await db.alertDispatch.create({
    data: {
      id: `alert-dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alertKey: input.alertKey,
      alertType: input.alertType,
      branchId: input.branchId ?? null,
      severity: input.severity,
      title: input.title,
      body: input.body,
      deviceToken: input.deviceToken ?? null,
    },
  });
}
