import { NextResponse } from "next/server";

import { requerirRol } from "@/lib/auth";
import {
  actualizarVehiculoPorId,
  darDeBajaVehiculoPorId,
  obtenerVehiculoPorId,
} from "@/lib/db/vehiculo";
import { responderError } from "@/lib/http";
import {
  actualizarVehiculoSchema,
  parametrosVehiculoSchema,
  type ParametrosVehiculo,
} from "@/lib/schemas/vehiculo";

type ContextoRutaVehiculo = {
  params: Promise<ParametrosVehiculo>;
};

export async function GET(
  _request: Request,
  { params }: ContextoRutaVehiculo,
) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosVehiculoSchema.safeParse(await params);

    if (!resultadoParametros.success) {
      return NextResponse.json(
        { error: "El id debe ser un UUID válido." },
        { status: 400 },
      );
    }

    const vehiculo = await obtenerVehiculoPorId(resultadoParametros.data.id);

    if (!vehiculo) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(vehiculo);
  } catch (error: unknown) {
    return responderError("GET /api/vehiculos/[id]", error);
  }
}

export async function PATCH(
  request: Request,
  { params }: ContextoRutaVehiculo,
) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosVehiculoSchema.safeParse(await params);

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

    const resultadoBody = actualizarVehiculoSchema.safeParse(body);

    if (!resultadoBody.success) {
      return NextResponse.json(
        { error: "Los datos del Vehículo son inválidos." },
        { status: 400 },
      );
    }

    const resultadoActualizacion = await actualizarVehiculoPorId(
      resultadoParametros.data.id,
      resultadoBody.data,
    );

    if (!resultadoActualizacion.actualizado) {
      if (resultadoActualizacion.motivo === "VEHICULO_NO_ENCONTRADO") {
        return NextResponse.json(
          { error: "Vehículo no encontrado." },
          { status: 404 },
        );
      }

      if (
        resultadoActualizacion.motivo ===
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

    return NextResponse.json(resultadoActualizacion.vehiculo);
  } catch (error: unknown) {
    return responderError("PATCH /api/vehiculos/[id]", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: ContextoRutaVehiculo,
) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoParametros = parametrosVehiculoSchema.safeParse(await params);

    if (!resultadoParametros.success) {
      return NextResponse.json(
        { error: "El id debe ser un UUID válido." },
        { status: 400 },
      );
    }

    const vehiculoDadoDeBaja = await darDeBajaVehiculoPorId(
      resultadoParametros.data.id,
    );

    if (!vehiculoDadoDeBaja) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return responderError("DELETE /api/vehiculos/[id]", error);
  }
}
