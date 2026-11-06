import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import { listarSiniestros } from "@/lib/db/siniestro";
import { responderError } from "@/lib/http";
import {
  crearSiniestroMultipartSchema,
  listadoSiniestrosQuerySchema,
} from "@/lib/schemas/siniestro";
import {
  esFechaSiniestroValida,
  registrarSiniestroConDocumentos,
} from "@/lib/services/siniestro";
import { convertirFormDataSiniestro } from "@/lib/services/siniestroMultipart";

export async function GET(request: Request) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

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
  } catch (error: unknown) {
    return responderError("GET /api/siniestros", error);
  }
}

export async function POST(request: Request) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Los datos del Siniestro son inválidos." },
        { status: 400 },
      );
    }

    const resultadoBody = crearSiniestroMultipartSchema.safeParse(
      convertirFormDataSiniestro(formData),
    );

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos del Siniestro son inválidos." },
        { status: 400 },
      );
    }

    const fechaRegistro = new Date();

    if (
      !esFechaSiniestroValida(resultadoBody.data.fechaSiniestro, fechaRegistro)
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha del Siniestro no puede ser posterior a la fecha de registro.",
        },
        { status: 400 },
      );
    }

    const resultadoCreacion = await registrarSiniestroConDocumentos(
      resultadoBody.data,
      fechaRegistro,
    );

    if (!resultadoCreacion.creado) {
      switch (resultadoCreacion.motivo) {
        case "ALMACENAMIENTO_FALLIDO":
          return NextResponse.json(
            { error: "No fue posible almacenar la documentación." },
            { status: 502 },
          );
        case "CLIENTE_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Cliente no encontrado." },
            { status: 404 },
          );
        case "VEHICULO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Vehículo no encontrado." },
            { status: 404 },
          );
        case "ASEGURADORA_NO_ENCONTRADA":
          return NextResponse.json(
            { error: "Aseguradora no encontrada." },
            { status: 404 },
          );
        case "CLIENTE_INACTIVO":
          return NextResponse.json(
            { error: "El Cliente indicado está inactivo." },
            { status: 409 },
          );
        case "VEHICULO_INACTIVO":
          return NextResponse.json(
            { error: "El Vehículo indicado está inactivo." },
            { status: 409 },
          );
        case "ASEGURADORA_INACTIVA":
          return NextResponse.json(
            { error: "La Aseguradora indicada está inactiva." },
            { status: 409 },
          );
        case "NUMERO_DUPLICADO":
          return NextResponse.json(
            { error: "Ya existe un Siniestro con el número indicado." },
            { status: 409 },
          );
      }
    }

    return NextResponse.json(resultadoCreacion.siniestro, { status: 201 });
  } catch (error: unknown) {
    return responderError("POST /api/siniestros", error);
  }
}
