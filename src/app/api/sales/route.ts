import { NextResponse } from "next/server";

import {
  createSaleInStorage,
  deleteSaleInStorage,
  updateSaleInStorage,
} from "@/server/database/business-repository";
import type {
  PersistedSalePayload,
  SaveSaleApiResponse,
} from "@/features/sales-register/types";

export const runtime = "nodejs";

type LegacySalePayload = {
  date: string;
  branch: string;
  professional: string;
  professionalId?: string;
  service: string;
  total: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  commission?: number;
  profit?: number;
  receiptNumber?: string;
  confirmDuplicate?: boolean;
};

type PersistedSalePayloadLike = PersistedSalePayload & {
  items?: Array<{
    label?: string;
    serviceLabel?: string;
    total?: number;
    grossTotal?: number;
  }>;
  serviceLabel?: string;
  branchName?: string;
  professionalName?: string;
  professionalId?: string;
  grossTotal?: number;
  clientName?: string;
  commissionTotal?: number;
  profitTotal?: number;
  receiptNumber?: string;
  confirmDuplicate?: boolean;

  // Campos que debe mandar la UI para tener prioridad real
  branch?: string;
  professional?: string;
};

function isPersistedSalePayload(
  body: unknown
): body is PersistedSalePayloadLike {
  return typeof body === "object" && body !== null && "branchName" in body;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeLegacyPayload(body: LegacySalePayload | PersistedSalePayloadLike) {
  return isPersistedSalePayload(body)
    ? {
        date: safeString(body.date),
        branch: safeString(body.branch) || safeString(body.branchName),
        professional:
          safeString(body.professional) || safeString(body.professionalName),
        professionalId: safeString(body.professionalId) || undefined,
        service:
          safeString(body.serviceLabel) ||
          safeString(body.items?.[0]?.label) ||
          safeString(body.items?.[0]?.serviceLabel) ||
          "Servicio desde boleta",
        total:
          safeNumber(body.grossTotal) ||
          body.items?.reduce((sum, item) => {
            return (
              sum +
              safeNumber(item.totalLineGross) +
              safeNumber((item as { grossTotal?: number }).grossTotal)
            );
          }, 0) ||
          0,
        clientName: safeString(body.clientName) || undefined,
        clientEmail: safeString(body.clientEmail) || undefined,
        clientPhone: safeString(body.clientPhone) || undefined,
        commission: safeNumber(body.commissionTotal),
        profit: safeNumber(body.profitTotal),
        receiptNumber: safeString(body.receiptNumber) || undefined,
        confirmDuplicate: Boolean(body.confirmDuplicate),
      }
    : {
        date: safeString(body.date),
        branch: safeString(body.branch),
        professional: safeString(body.professional),
        professionalId: safeString(body.professionalId) || undefined,
        service: safeString(body.service),
        total: safeNumber(body.total),
        clientName: safeString(body.clientName) || undefined,
        clientEmail: safeString(body.clientEmail) || undefined,
        clientPhone: safeString(body.clientPhone) || undefined,
        commission: safeNumber(body.commission),
        profit: safeNumber(body.profit),
        receiptNumber: safeString(body.receiptNumber) || undefined,
        confirmDuplicate: Boolean(body.confirmDuplicate),
      };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | LegacySalePayload
      | PersistedSalePayloadLike;

    const normalizedPayload: LegacySalePayload = normalizeLegacyPayload(body);

    console.log("SALE_PAYLOAD_RAW", body);
    console.log("SALE_PAYLOAD_NORMALIZED", normalizedPayload);

    if (!normalizedPayload.date) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta fecha.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    if (!normalizedPayload.professional) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta profesional.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    if (!normalizedPayload.branch) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta sucursal.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    if (!normalizedPayload.service) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta servicio.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    if (!normalizedPayload.total || normalizedPayload.total <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El total de la venta es inválido.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    const result = await createSaleInStorage(normalizedPayload);

    console.log("SALE_SAVE_RESULT", result);

    if ("duplicate" in result && result.duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: result.duplicate.message,
          duplicate: result.duplicate,
        } satisfies SaveSaleApiResponse,
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.usedFallbackDate
        ? "Venta registrada usando la fecha de hoy por fallback."
        : "Venta registrada correctamente.",
      sale: result.sale,
    } satisfies SaveSaleApiResponse);
  } catch (error) {
    console.error("SALE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude registrar la venta.",
      } satisfies SaveSaleApiResponse,
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as
      | (LegacySalePayload & { id?: string })
      | (PersistedSalePayloadLike & { id?: string });
    const saleId = safeString(body.id);

    if (!saleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el identificador de la venta.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    const normalizedPayload = normalizeLegacyPayload(body);
    const result = await updateSaleInStorage({
      id: saleId,
      ...normalizedPayload,
    });

    return NextResponse.json({
      success: true,
      message: "Venta actualizada correctamente.",
      sale: result.sale,
    } satisfies SaveSaleApiResponse);
  } catch (error) {
    console.error("SALE_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude actualizar la venta.",
      } satisfies SaveSaleApiResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const saleId = safeString(searchParams.get("id"));

    if (!saleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el identificador de la venta.",
        } satisfies SaveSaleApiResponse,
        { status: 400 }
      );
    }

    await deleteSaleInStorage({ id: saleId });

    return NextResponse.json({
      success: true,
      message: "Venta eliminada correctamente.",
    } satisfies SaveSaleApiResponse);
  } catch (error) {
    console.error("SALE_DELETE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No pude eliminar la venta.",
      } satisfies SaveSaleApiResponse,
      { status: 500 }
    );
  }
}
