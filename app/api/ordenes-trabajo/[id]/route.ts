import { NextResponse } from "next/server";

import { obtenerOrdenTrabajoPorId } from "@/lib/db/ordenTrabajo";
import {
  parametrosOrdenTrabajoSchema,
  type ParametrosOrdenTrabajo,
} from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

type ContextoRutaOrdenTrabajo = {
  params: Promise<ParametrosOrdenTrabajo>;
};

export async function GET(
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

    const ordenTrabajo = await obtenerOrdenTrabajoPorId(
      resultadoParametros.data.id,
    );

    if (!ordenTrabajo) {
      return NextResponse.json(
        { error: "Orden de Trabajo no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializarDetalleOrdenTrabajo(ordenTrabajo));
  } catch (error: unknown) {
    console.error(
      "Error inesperado en GET /api/ordenes-trabajo/[id]",
      error,
    );

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
