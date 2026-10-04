import { NextResponse } from "next/server";

import { listarPresupuestos } from "@/lib/db/presupuesto";
import { listadoPresupuestosQuerySchema } from "@/lib/schemas/presupuesto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resultadoQuery = listadoPresupuestosQuerySchema.safeParse({
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
  const { presupuestos, total } = await listarPresupuestos(page, limit);

  return NextResponse.json({
    data: presupuestos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
