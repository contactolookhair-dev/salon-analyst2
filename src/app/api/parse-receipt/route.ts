import { NextResponse } from "next/server";

import { parseReceiptBuffer } from "@/features/receipt-parser/receipt-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes enviar un archivo PDF válido." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await parseReceiptBuffer(Buffer.from(arrayBuffer));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pude procesar la boleta.",
      },
      { status: 500 }
    );
  }
}
