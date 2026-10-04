import { NextResponse } from "next/server";

import { listarSiniestros } from "@/lib/db/siniestro";
import { listadoSiniestrosQuerySchema } from "@/lib/schemas/siniestro";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resultadoQuery = listadoSiniestrosQuerySchema.safeParse({
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
  const { siniestros, total } = await listarSiniestros(page, limit);

  return NextResponse.json({
    data: siniestros,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
