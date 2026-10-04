import { NextResponse } from "next/server";

import { obtenerClientePorId } from "@/lib/db/cliente";
import {
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
}
