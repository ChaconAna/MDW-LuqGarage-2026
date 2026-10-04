import { NextResponse } from "next/server";

import { crearVehiculo, listarVehiculos } from "@/lib/db/vehiculo";
import {
  crearVehiculoSchema,
  listadoVehiculosQuerySchema,
} from "@/lib/schemas/vehiculo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resultadoQuery = listadoVehiculosQuerySchema.safeParse({
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
  const { vehiculos, total } = await listarVehiculos(page, limit);

  return NextResponse.json({
    data: vehiculos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un JSON válido." },
      { status: 400 },
    );
  }

  const resultadoBody = crearVehiculoSchema.safeParse(body);

  if (!resultadoBody.success) {
    return NextResponse.json(
      { error: "Los datos del Vehículo son inválidos." },
      { status: 400 },
    );
  }

  const resultadoCreacion = await crearVehiculo(resultadoBody.data);

  if (!resultadoCreacion.creado) {
    if (
      resultadoCreacion.motivo ===
      "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO"
    ) {
      return NextResponse.json(
        { error: "Modelo o Tipo de Vehículo no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Ya existe un Vehículo con la patente indicada." },
      { status: 409 },
    );
  }

  return NextResponse.json(resultadoCreacion.vehiculo, { status: 201 });
}
