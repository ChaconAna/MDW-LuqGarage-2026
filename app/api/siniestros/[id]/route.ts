import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import { responderError } from "@/lib/http";
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
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

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
  } catch (error: unknown) {
    return responderError("GET /api/siniestros/[id]", error);
  }
}
