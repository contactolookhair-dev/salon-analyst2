import { NextResponse } from "next/server";

import {
  createCustomerInStorage,
  deleteCustomerInStorage,
  getCustomersFromStorage,
  updateCustomerInStorage,
} from "@/server/database/business-repository";
import { getDbStatus } from "@/server/database/db-client";
import type { Customer } from "@/shared/types/business";

export const runtime = "nodejs";

function ensurePersistentDb() {
  const dbStatus = getDbStatus();

  if (!dbStatus.available || !dbStatus.persistent) {
    return NextResponse.json(
      {
        success: false,
        error:
          dbStatus.reason ??
          "No hay una base de datos persistente configurada para guardar clientes.",
      },
      { status: 503 }
    );
  }

  return null;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCustomerResponse(body: Record<string, unknown>): Customer {
  const name = safeString(body.name);
  const email = safeString(body.email);
  const phone = safeString(body.phone);

  return {
    id:
      safeString(body.id) ||
      `${name.toLowerCase()}-${email.toLowerCase()}-${phone}`.replace(/[^a-z0-9]+/g, "-"),
    name,
    email: email || undefined,
    phone: phone || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const customers = await getCustomersFromStorage();

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los clientes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!safeString(body.name)) {
      return NextResponse.json(
        { success: false, error: "Falta nombre del cliente." },
        { status: 400 }
      );
    }

    const customer = await createCustomerInStorage({
      name: safeString(body.name),
      email: safeString(body.email) || undefined,
      phone: safeString(body.phone) || undefined,
    });

    return NextResponse.json({
      success: true,
      data: customer ?? buildCustomerResponse(body),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el cliente.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = safeString(body.id);

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Falta ID del cliente." },
        { status: 400 }
      );
    }

    if (!safeString(body.name)) {
      return NextResponse.json(
        { success: false, error: "Falta nombre del cliente." },
        { status: 400 }
      );
    }

    const customer = await updateCustomerInStorage({
      id: customerId,
      name: safeString(body.name),
      email: safeString(body.email) || undefined,
      phone: safeString(body.phone) || undefined,
    });

    return NextResponse.json({
      success: true,
      data: customer ?? buildCustomerResponse(body),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el cliente.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const dbError = ensurePersistentDb();

  if (dbError) {
    return dbError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = safeString(body.id);

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Falta ID del cliente." },
        { status: 400 }
      );
    }

    await deleteCustomerInStorage({ id: customerId });

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el cliente.",
      },
      { status: 500 }
    );
  }
}
