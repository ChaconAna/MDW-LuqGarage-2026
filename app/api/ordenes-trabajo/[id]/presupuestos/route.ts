import { NextResponse } from "next/server";

import { agregarPresupuestosOrdenTrabajoPorId } from "@/lib/db/ordenTrabajo";
import {
  agregarPresupuestosOrdenTrabajoSchema,
  parametrosOrdenTrabajoSchema,
  type ParametrosOrdenTrabajo,
} from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

type ContextoRutaOrdenTrabajo = {
  params: Promise<ParametrosOrdenTrabajo>;
};

export async function POST(
  request: Request,
  { params }: ContextoRutaOrdenTrabajo,
) {
  try {
    const resultadoParametros = parametrosOrdenTrabajoSchema.safeParse(
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

    const resultadoBody =
      agregarPresupuestosOrdenTrabajoSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos para agregar Presupuestos son inválidos." },
        { status: 400 },
      );
    }

    const resultadoActualizacion =
      await agregarPresupuestosOrdenTrabajoPorId(
        resultadoParametros.data.id,
        resultadoBody.data,
      );

    if (!resultadoActualizacion.actualizada) {
      switch (resultadoActualizacion.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA":
          return NextResponse.json(
            { error: "Orden de Trabajo no encontrada." },
            { status: 404 },
          );
        case "PRESUPUESTO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Uno o más Presupuestos no fueron encontrados." },
            { status: 404 },
          );
        case "ORDEN_TRABAJO_NO_EDITABLE":
          return NextResponse.json(
            { error: "La Orden de Trabajo no está en estado BORRADOR." },
            { status: 409 },
          );
        case "PRESUPUESTO_NO_APROBADO":
          return NextResponse.json(
            { error: "Uno o más Presupuestos no están aprobados." },
            { status: 409 },
          );
        case "PRESUPUESTO_OTRO_SINIESTRO":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos no pertenecen al Siniestro de la Orden de Trabajo.",
            },
            { status: 409 },
          );
        case "PRESUPUESTO_YA_PERTENECE":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos ya pertenecen a esta Orden de Trabajo.",
            },
            { status: 409 },
          );
        case "PRESUPUESTO_YA_ASOCIADO":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos ya están asociados a otra Orden de Trabajo.",
            },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetalleOrdenTrabajo(resultadoActualizacion.ordenTrabajo),
    );
  } catch (error: unknown) {
    console.error(
      "Error inesperado en POST /api/ordenes-trabajo/[id]/presupuestos",
      error,
    );

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
