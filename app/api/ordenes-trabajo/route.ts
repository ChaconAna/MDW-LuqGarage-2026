import { NextResponse } from "next/server";

import { listarOrdenesTrabajo } from "@/lib/db/ordenTrabajo";
import { listadoOrdenesTrabajoQuerySchema } from "@/lib/schemas/ordenTrabajo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resultadoQuery = listadoOrdenesTrabajoQuerySchema.safeParse({
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
    const { ordenesTrabajo, total } = await listarOrdenesTrabajo(page, limit);

    return NextResponse.json({
      data: ordenesTrabajo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error(
      "Error inesperado en GET /api/ordenes-trabajo",
      error,
    );

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
