import { NextResponse } from "next/server";

import { obtenerPresupuestoPorId } from "@/lib/db/presupuesto";
import {
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
}
