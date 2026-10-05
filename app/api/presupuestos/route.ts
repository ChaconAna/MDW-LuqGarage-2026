import { NextResponse } from "next/server";

import { crearPresupuesto, listarPresupuestos } from "@/lib/db/presupuesto";
import {
  crearPresupuestoSchema,
  listadoPresupuestosQuerySchema,
} from "@/lib/schemas/presupuesto";
import { serializarDetallePresupuesto } from "@/lib/services/presupuesto";

export async function GET(request: Request) {
  try {
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
  } catch (error: unknown) {
    console.error("Error inesperado en GET /api/presupuestos", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un JSON válido." },
      { status: 400 },
    );
  }

  const resultadoBody = crearPresupuestoSchema.safeParse(body);

  if (!resultadoBody.success) {
    return NextResponse.json(
      { error: "Los datos del Presupuesto son inválidos." },
      { status: 400 },
    );
  }

  const resultadoCreacion = await crearPresupuesto(resultadoBody.data);

  if (!resultadoCreacion.creado) {
    switch (resultadoCreacion.motivo) {
      case "SINIESTRO_NO_ENCONTRADO":
        return NextResponse.json(
          { error: "Siniestro no encontrado." },
          { status: 404 },
        );
      case "REPARACION_NO_ENCONTRADA":
        return NextResponse.json(
          { error: "Una o más Reparaciones no fueron encontradas." },
          { status: 404 },
        );
      case "REPUESTO_NO_ENCONTRADO":
        return NextResponse.json(
          { error: "Uno o más Repuestos no fueron encontrados." },
          { status: 404 },
        );
      case "NUMERO_DUPLICADO":
        return NextResponse.json(
          { error: "Ya existe un Presupuesto con el número indicado." },
          { status: 409 },
        );
    }
  }

  return NextResponse.json(
    serializarDetallePresupuesto(resultadoCreacion.presupuesto),
    { status: 201 },
  );
  } catch (error: unknown) {
    console.error("Error inesperado en POST /api/presupuestos", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
