import { NextResponse } from "next/server";
import { MAINTENANCE_PROTECTED_RESOURCES } from "@/features/configuration/lib/maintenance-constants";

const REQUIRED_CONFIRMATION = "BORRAR";
export { MAINTENANCE_PROTECTED_RESOURCES };

export function isMaintenanceAuthorized() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.MAINTENANCE_TOOLS_ENABLED === "true"
  );
}

export async function parseMaintenanceRequest(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    confirmation?: string;
  };

  if (!isMaintenanceAuthorized()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Las herramientas de mantenimiento están deshabilitadas en este entorno.",
        },
        { status: 403 }
      ),
    };
  }

  if ((body.confirmation ?? "").trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Debes escribir BORRAR para confirmar la acción.",
        },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
  };
}
