import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import { crearAseguradora, listarAseguradoras } from "@/lib/db/aseguradora";
import { responderError } from "@/lib/http";
import {
  crearAseguradoraSchema,
  listadoAseguradorasQuerySchema,
} from "@/lib/schemas/aseguradora";

export async function GET(request: Request) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const { searchParams } = new URL(request.url);
    const resultadoQuery = listadoAseguradorasQuerySchema.safeParse({
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
    const { aseguradoras, total } = await listarAseguradoras(page, limit);

    return NextResponse.json({
      data: aseguradoras,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    return responderError("GET /api/aseguradoras", error);
  }
}

export async function POST(request: Request) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es un JSON válido." },
        { status: 400 },
      );
    }

    const resultadoBody = crearAseguradoraSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos de la Aseguradora son inválidos." },
        { status: 400 },
      );
    }

    const resultadoCreacion = await crearAseguradora(resultadoBody.data);

    if (!resultadoCreacion.creada) {
      return NextResponse.json(
        { error: "Ya existe una Aseguradora con el CUIT indicado." },
        { status: 409 },
      );
    }

    return NextResponse.json(resultadoCreacion.aseguradora, { status: 201 });
  } catch (error: unknown) {
    return responderError("POST /api/aseguradoras", error);
  }
}
