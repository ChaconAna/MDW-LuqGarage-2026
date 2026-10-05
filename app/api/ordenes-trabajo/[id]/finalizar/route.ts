import { NextResponse } from "next/server";

import { finalizarOrdenTrabajoPorId } from "@/lib/db/ordenTrabajo";
import {
  parametrosOrdenTrabajoSchema,
  type ParametrosOrdenTrabajo,
} from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

type ContextoRutaOrdenTrabajo = {
  params: Promise<ParametrosOrdenTrabajo>;
};

export async function POST(
  _request: Request,
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

    const resultadoFinalizacion = await finalizarOrdenTrabajoPorId(
      resultadoParametros.data.id,
    );

    if (!resultadoFinalizacion.finalizada) {
      switch (resultadoFinalizacion.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA":
          return NextResponse.json(
            { error: "Orden de Trabajo no encontrada." },
            { status: 404 },
          );
        case "ORDEN_TRABAJO_NO_EDITABLE":
          return NextResponse.json(
            { error: "La Orden de Trabajo no está en estado BORRADOR." },
            { status: 409 },
          );
        case "ORDEN_TRABAJO_SIN_PRESUPUESTOS":
          return NextResponse.json(
            {
              error:
                "La Orden de Trabajo debe tener al menos un Presupuesto aprobado.",
            },
            { status: 409 },
          );
        case "PRESUPUESTO_NO_APROBADO":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos de la Orden de Trabajo no están aprobados.",
            },
            { status: 409 },
          );
        case "REPARACIONES_SIN_SECTORIZAR":
          return NextResponse.json(
            {
              error:
                "La Orden de Trabajo tiene Reparaciones sin sectorizar.",
            },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetalleOrdenTrabajo(resultadoFinalizacion.ordenTrabajo),
    );
  } catch (error: unknown) {
    console.error(
      "Error inesperado en POST /api/ordenes-trabajo/[id]/finalizar",
      error,
    );

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
