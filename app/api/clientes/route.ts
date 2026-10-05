import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import { crearCliente, listarClientes } from "@/lib/db/cliente";
import { responderError } from "@/lib/http";
import {
  crearClienteSchema,
  listadoClientesQuerySchema,
} from "@/lib/schemas/cliente";

export async function GET(request: Request) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

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
  } catch (error: unknown) {
    return responderError("GET /api/clientes", error);
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

    const resultadoBody = crearClienteSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos del Cliente son inválidos." },
        { status: 400 },
      );
    }

    const resultadoCreacion = await crearCliente(resultadoBody.data);

    if (!resultadoCreacion.creado) {
      if (resultadoCreacion.motivo === "LOCALIDAD_NO_ENCONTRADA") {
        return NextResponse.json(
          { error: "Localidad no encontrada." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Ya existe un Cliente con el DNI indicado." },
        { status: 409 },
      );
    }

    return NextResponse.json(resultadoCreacion.cliente, { status: 201 });
  } catch (error: unknown) {
    return responderError("POST /api/clientes", error);
  }
}
