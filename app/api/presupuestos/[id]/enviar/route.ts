import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import { enviarPresupuestoPorId } from "@/lib/db/presupuesto";
import { responderError } from "@/lib/http";
import {
  parametrosPresupuestoSchema,
  type ParametrosPresupuesto,
} from "@/lib/schemas/presupuesto";
import { serializarDetallePresupuesto } from "@/lib/services/presupuesto";

type ContextoRutaPresupuesto = {
  params: Promise<ParametrosPresupuesto>;
};

export async function POST(
  _request: Request,
  { params }: ContextoRutaPresupuesto,
) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosPresupuestoSchema.safeParse(
      await params,
    );

    if (!resultadoParametros.success) {
      return NextResponse.json(
        { error: "El id debe ser un UUID válido." },
        { status: 400 },
      );
    }

    const resultadoEnvio = await enviarPresupuestoPorId(
      resultadoParametros.data.id,
    );

    if (!resultadoEnvio.enviado) {
      switch (resultadoEnvio.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Presupuesto no encontrado." },
            { status: 404 },
          );
        case "PRESUPUESTO_NO_ENVIABLE":
          return NextResponse.json(
            { error: "El Presupuesto no está en estado BORRADOR." },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetallePresupuesto(resultadoEnvio.presupuesto),
    );
  } catch (error: unknown) {
    return responderError("POST /api/presupuestos/[id]/enviar", error);
  }
}
