import { NextResponse } from "next/server";

import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import {
  parametrosSiniestroSchema,
  type ParametrosSiniestro,
} from "@/lib/schemas/siniestro";

type ContextoRutaSiniestro = {
  params: Promise<ParametrosSiniestro>;
};

export async function GET(
  _request: Request,
  { params }: ContextoRutaSiniestro,
) {
  const resultadoParametros = parametrosSiniestroSchema.safeParse(
    await params,
  );

  if (!resultadoParametros.success) {
    return NextResponse.json(
      { error: "El id debe ser un UUID válido." },
      { status: 400 },
    );
  }

  const siniestro = await obtenerSiniestroPorId(resultadoParametros.data.id);

  if (!siniestro) {
    return NextResponse.json(
      { error: "Siniestro no encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(siniestro);
}
