import { NextResponse } from "next/server";

import { ErrorAutenticacion, ErrorAutorizacion } from "@/lib/auth";

export function responderError(contexto: string, error: unknown): NextResponse {
  if (error instanceof ErrorAutenticacion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (error instanceof ErrorAutorizacion) {
    return NextResponse.json(
      { error: "No podés realizar esta operación" },
      { status: 403 },
    );
  }

  console.error(`Error inesperado en ${contexto}`, error);

  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
