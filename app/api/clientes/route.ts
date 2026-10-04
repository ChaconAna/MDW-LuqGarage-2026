import { NextResponse } from "next/server";

import { listarClientes } from "@/lib/db/cliente";
import { listadoClientesQuerySchema } from "@/lib/schemas/cliente";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resultadoQuery = listadoClientesQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!resultadoQuery.success) {
    return NextResponse.json(
      { error: "Los parámetros de paginación son inválidos." },
      { status: 400 },
    );
  }

  const { page, limit } = resultadoQuery.data;
  const { clientes, total } = await listarClientes(page, limit);

  return NextResponse.json({
    data: clientes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
