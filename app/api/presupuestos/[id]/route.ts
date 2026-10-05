import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import {
  actualizarPresupuestoPorId,
  obtenerPresupuestoPorId,
} from "@/lib/db/presupuesto";
import { responderError } from "@/lib/http";
import {
  actualizarPresupuestoSchema,
  parametrosPresupuestoSchema,
  type ParametrosPresupuesto,
} from "@/lib/schemas/presupuesto";
import { serializarDetallePresupuesto } from "@/lib/services/presupuesto";

type ContextoRutaPresupuesto = {
  params: Promise<ParametrosPresupuesto>;
};

export async function GET(
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

    const presupuesto = await obtenerPresupuestoPorId(
      resultadoParametros.data.id,
    );

    if (!presupuesto) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializarDetallePresupuesto(presupuesto));
  } catch (error: unknown) {
    return responderError("GET /api/presupuestos/[id]", error);
  }
}

export async function PATCH(
  request: Request,
  { params }: ContextoRutaPresupuesto,
) {
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosPresupuestoSchema.safeParse(
      await params,
    );

    if (!resultadoParametros.success) {
      return NextResponse.json(
        { error: "El id debe ser un UUID válido." },
        { status: 400 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es un JSON válido." },
        { status: 400 },
      );
    }

    const resultadoBody = actualizarPresupuestoSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos del Presupuesto son inválidos." },
        { status: 400 },
      );
    }

    const resultadoActualizacion = await actualizarPresupuestoPorId(
      resultadoParametros.data.id,
      resultadoBody.data,
    );

    if (!resultadoActualizacion.actualizado) {
      switch (resultadoActualizacion.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Presupuesto no encontrado." },
            { status: 404 },
          );
        case "REPARACION_NO_ENCONTRADA":
          return NextResponse.json(
            { error: "Una o más Reparaciones no fueron encontradas." },
            { status: 404 },
          );
        case "REPUESTO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Uno o más Repuestos no fueron encontrados." },
            { status: 404 },
          );
        case "PRESUPUESTO_NO_EDITABLE":
          return NextResponse.json(
            {
              error:
                "El Presupuesto sólo puede modificarse en estado BORRADOR.",
            },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetallePresupuesto(resultadoActualizacion.presupuesto),
    );
  } catch (error: unknown) {
    return responderError("PATCH /api/presupuestos/[id]", error);
  }
}
