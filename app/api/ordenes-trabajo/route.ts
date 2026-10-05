import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import {
  crearOrdenTrabajo,
  listarOrdenesTrabajo,
  listarOrdenesTrabajoFinalizadas,
} from "@/lib/db/ordenTrabajo";
import { responderError } from "@/lib/http";
import {
  crearOrdenTrabajoSchema,
  listadoOrdenesTrabajoQuerySchema,
} from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

export async function GET(request: Request) {
  try {
    const usuario = await requerirRol([
      "ENCARGADO_DEL_TALLER",
      "MECANICO",
    ]);

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
    const { ordenesTrabajo, total } =
      usuario.rol === "MECANICO"
        ? await listarOrdenesTrabajoFinalizadas(page, limit)
        : await listarOrdenesTrabajo(page, limit);

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
    return responderError("GET /api/ordenes-trabajo", error);
  }
}

export async function POST(request: Request) {
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es un JSON válido." },
        { status: 400 },
      );
    }

    const resultadoBody = crearOrdenTrabajoSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos de la Orden de Trabajo son inválidos." },
        { status: 400 },
      );
    }

    const resultadoCreacion = await crearOrdenTrabajo(resultadoBody.data);

    if (!resultadoCreacion.creada) {
      switch (resultadoCreacion.motivo) {
        case "SINIESTRO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Siniestro no encontrado." },
            { status: 404 },
          );
        case "PRESUPUESTO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Uno o más Presupuestos no fueron encontrados." },
            { status: 404 },
          );
        case "PRESUPUESTO_NO_APROBADO":
          return NextResponse.json(
            { error: "Uno o más Presupuestos no están aprobados." },
            { status: 409 },
          );
        case "PRESUPUESTO_OTRO_SINIESTRO":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos no pertenecen al Siniestro indicado.",
            },
            { status: 409 },
          );
        case "PRESUPUESTO_YA_ASOCIADO":
          return NextResponse.json(
            {
              error:
                "Uno o más Presupuestos ya están asociados a otra Orden de Trabajo.",
            },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetalleOrdenTrabajo(resultadoCreacion.ordenTrabajo),
      { status: 201 },
    );
  } catch (error: unknown) {
    return responderError("POST /api/ordenes-trabajo", error);
  }
}
