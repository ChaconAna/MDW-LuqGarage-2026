import { NextResponse } from "next/server";

import {
  actualizarAseguradoraPorId,
  darDeBajaAseguradoraPorId,
  obtenerAseguradoraPorId,
} from "@/lib/db/aseguradora";
import {
  actualizarAseguradoraSchema,
  parametrosAseguradoraSchema,
  type ParametrosAseguradora,
} from "@/lib/schemas/aseguradora";

type ContextoRutaAseguradora = {
  params: Promise<ParametrosAseguradora>;
};

export async function GET(
  _request: Request,
  { params }: ContextoRutaAseguradora,
) {
  const resultadoParametros = parametrosAseguradoraSchema.safeParse(
    await params,
  );

  if (!resultadoParametros.success) {
    return NextResponse.json(
      { error: "El id debe ser un UUID válido." },
      { status: 400 },
    );
  }

  const aseguradora = await obtenerAseguradoraPorId(
    resultadoParametros.data.id,
  );

  if (!aseguradora) {
    return NextResponse.json(
      { error: "Aseguradora no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json(aseguradora);
}

export async function PATCH(
  request: Request,
  { params }: ContextoRutaAseguradora,
) {
  const resultadoParametros = parametrosAseguradoraSchema.safeParse(
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

  const resultadoBody = actualizarAseguradoraSchema.safeParse(body);

  if (!resultadoBody.success) {
    return NextResponse.json(
      { error: "Los datos de la Aseguradora son inválidos." },
      { status: 400 },
    );
  }

  const resultadoActualizacion = await actualizarAseguradoraPorId(
    resultadoParametros.data.id,
    resultadoBody.data,
  );

  if (!resultadoActualizacion.actualizada) {
    if (resultadoActualizacion.motivo === "ASEGURADORA_NO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Aseguradora no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Ya existe una Aseguradora con el CUIT indicado." },
      { status: 409 },
    );
  }

  return NextResponse.json(resultadoActualizacion.aseguradora);
}

export async function DELETE(
  _request: Request,
  { params }: ContextoRutaAseguradora,
) {
  const resultadoParametros = parametrosAseguradoraSchema.safeParse(
    await params,
  );

  if (!resultadoParametros.success) {
    return NextResponse.json(
      { error: "El id debe ser un UUID válido." },
      { status: 400 },
    );
  }

  const aseguradoraDadaDeBaja = await darDeBajaAseguradoraPorId(
    resultadoParametros.data.id,
  );

  if (!aseguradoraDadaDeBaja) {
    return NextResponse.json(
      { error: "Aseguradora no encontrada." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
