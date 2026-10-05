import { NextResponse } from "next/server";

import {
  actualizarClientePorId,
  darDeBajaClientePorId,
  obtenerClientePorId,
} from "@/lib/db/cliente";
import {
  actualizarClienteSchema,
  parametrosClienteSchema,
  type ParametrosCliente,
} from "@/lib/schemas/cliente";

type ContextoRutaCliente = {
  params: Promise<ParametrosCliente>;
};

export async function GET(
  _request: Request,
  { params }: ContextoRutaCliente,
) {
  try {
  const resultadoParametros = parametrosClienteSchema.safeParse(await params);

  if (!resultadoParametros.success) {
    return NextResponse.json(
      { error: "El id debe ser un UUID válido." },
      { status: 400 },
    );
  }

  const cliente = await obtenerClientePorId(resultadoParametros.data.id);

  if (!cliente) {
    return NextResponse.json(
      { error: "Cliente no encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(cliente);
  } catch (error: unknown) {
    console.error("Error inesperado en GET /api/clientes/[id]", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: ContextoRutaCliente,
) {
  try {
  const resultadoParametros = parametrosClienteSchema.safeParse(await params);

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

  const resultadoBody = actualizarClienteSchema.safeParse(body);

  if (!resultadoBody.success) {
    return NextResponse.json(
      { error: "Los datos del Cliente son inválidos." },
      { status: 400 },
    );
  }

  const resultadoActualizacion = await actualizarClientePorId(
    resultadoParametros.data.id,
    resultadoBody.data,
  );

  if (!resultadoActualizacion.actualizado) {
    if (resultadoActualizacion.motivo === "CLIENTE_NO_ENCONTRADO") {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 },
      );
    }

    if (resultadoActualizacion.motivo === "LOCALIDAD_NO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Localidad no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Ya existe un Cliente con el DNI indicado." },
      { status: 409 },
    );
  }

  return NextResponse.json(resultadoActualizacion.cliente);
  } catch (error: unknown) {
    console.error("Error inesperado en PATCH /api/clientes/[id]", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: ContextoRutaCliente,
) {
  try {
  const resultadoParametros = parametrosClienteSchema.safeParse(await params);

  if (!resultadoParametros.success) {
    return NextResponse.json(
      { error: "El id debe ser un UUID válido." },
      { status: 400 },
    );
  }

  const clienteDadoDeBaja = await darDeBajaClientePorId(
    resultadoParametros.data.id,
  );

  if (!clienteDadoDeBaja) {
    return NextResponse.json(
      { error: "Cliente no encontrado." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error inesperado en DELETE /api/clientes/[id]", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
