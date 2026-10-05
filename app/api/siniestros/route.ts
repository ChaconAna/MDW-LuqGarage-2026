import { NextResponse } from "next/server";

import { crearSiniestro, listarSiniestros } from "@/lib/db/siniestro";
import {
  crearSiniestroSchema,
  listadoSiniestrosQuerySchema,
} from "@/lib/schemas/siniestro";

export async function GET(request: Request) {
  try {
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
    console.error("Error inesperado en GET /api/siniestros", error);

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

  const resultadoBody = crearSiniestroSchema.safeParse(body);

  if (!resultadoBody.success) {
    return NextResponse.json(
      { error: "Los datos del Siniestro son inválidos." },
      { status: 400 },
    );
  }

  const fechaRegistro = new Date();

  if (resultadoBody.data.fechaSiniestro > fechaRegistro) {
    return NextResponse.json(
      {
        error:
          "La fecha del Siniestro no puede ser posterior a la fecha de registro.",
      },
      { status: 400 },
    );
  }

  const resultadoCreacion = await crearSiniestro(
    resultadoBody.data,
    fechaRegistro,
  );

  if (!resultadoCreacion.creado) {
    switch (resultadoCreacion.motivo) {
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
    console.error("Error inesperado en POST /api/siniestros", error);

    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
