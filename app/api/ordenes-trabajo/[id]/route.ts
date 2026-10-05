import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import {
  actualizarObservacionesOrdenTrabajoPorId,
  obtenerOrdenTrabajoPorId,
} from "@/lib/db/ordenTrabajo";
import { responderError } from "@/lib/http";
import {
  actualizarObservacionesOrdenTrabajoSchema,
  parametrosOrdenTrabajoSchema,
  type ParametrosOrdenTrabajo,
} from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

type ContextoRutaOrdenTrabajo = {
  params: Promise<ParametrosOrdenTrabajo>;
};

export async function GET(
  _request: Request,
  { params }: ContextoRutaOrdenTrabajo,
) {
  try {
    const resultadoParametros = parametrosOrdenTrabajoSchema.safeParse(
      await params,
    );

    if (!resultadoParametros.success) {
      return NextResponse.json(
        { error: "El id debe ser un UUID válido." },
        { status: 400 },
      );
    }

    const ordenTrabajo = await obtenerOrdenTrabajoPorId(
      resultadoParametros.data.id,
    );

    if (!ordenTrabajo) {
      return NextResponse.json(
        { error: "Orden de Trabajo no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializarDetalleOrdenTrabajo(ordenTrabajo));
  } catch (error: unknown) {
    console.error(
      "Error inesperado en GET /api/ordenes-trabajo/[id]",
      error,
    );

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: ContextoRutaOrdenTrabajo,
) {
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosOrdenTrabajoSchema.safeParse(
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

    const resultadoBody =
      actualizarObservacionesOrdenTrabajoSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos de la Orden de Trabajo son inválidos." },
        { status: 400 },
      );
    }

    const resultadoActualizacion =
      await actualizarObservacionesOrdenTrabajoPorId(
        resultadoParametros.data.id,
        resultadoBody.data,
      );

    if (!resultadoActualizacion.actualizada) {
      switch (resultadoActualizacion.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA":
          return NextResponse.json(
            { error: "Orden de Trabajo no encontrada." },
            { status: 404 },
          );
        case "SECTOR_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Uno o más Sectores no fueron encontrados." },
            { status: 404 },
          );
        case "ORDEN_TRABAJO_NO_EDITABLE":
          return NextResponse.json(
            { error: "La Orden de Trabajo no está en estado BORRADOR." },
            { status: 409 },
          );
        case "SECTOR_NO_PERTENECE":
          return NextResponse.json(
            {
              error:
                "Uno o más Sectores no pertenecen a la Orden de Trabajo.",
            },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(
      serializarDetalleOrdenTrabajo(resultadoActualizacion.ordenTrabajo),
    );
  } catch (error: unknown) {
    return responderError("PATCH /api/ordenes-trabajo/[id]", error);
  }
}
