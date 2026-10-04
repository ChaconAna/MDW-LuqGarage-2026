import { Prisma } from "@prisma/client";

import type {
  DatosActualizacionVehiculo,
  DatosCreacionVehiculo,
} from "../schemas/vehiculo";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionVehiculo = {
  id: true,
  patente: true,
  activo: true,
  modelo: {
    select: {
      id: true,
      nombre: true,
      marca: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  tipoVehiculo: {
    select: {
      id: true,
      nombre: true,
    },
  },
} satisfies Prisma.VehiculoSelect;

type DatosVehiculo = {
  patente: string;
  activo: boolean;
  modeloId: string;
  tipoVehiculoId: string;
};

export function asegurarVehiculoPorPatente(
  cliente: ClienteTransaccion,
  datos: DatosVehiculo,
) {
  return cliente.vehiculo.upsert({
    where: { patente: datos.patente },
    update: datos,
    create: datos,
  });
}

export function obtenerVehiculoPorId(id: string) {
  return prisma.vehiculo.findUnique({
    where: { id },
    select: seleccionVehiculo,
  });
}

export async function listarVehiculos(page: number, limit: number) {
  const [vehiculos, total] = await prisma.$transaction([
    prisma.vehiculo.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionVehiculo,
    }),
    prisma.vehiculo.count(),
  ]);

  return { vehiculos, total };
}

export async function crearVehiculo(datos: DatosCreacionVehiculo) {
  try {
    const vehiculo = await prisma.vehiculo.create({
      data: {
        ...datos,
        activo: true,
      },
      select: seleccionVehiculo,
    });

    return { creado: true, vehiculo } as const;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { creado: false, motivo: "PATENTE_DUPLICADA" } as const;
      }

      if (error.code === "P2003") {
        return {
          creado: false,
          motivo: "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO",
        } as const;
      }
    }

    throw error;
  }
}

export async function actualizarVehiculoPorId(
  id: string,
  datos: DatosActualizacionVehiculo,
) {
  try {
    const vehiculo = await prisma.vehiculo.update({
      where: { id },
      data: datos,
      select: seleccionVehiculo,
    });

    return { actualizado: true, vehiculo } as const;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          actualizado: false,
          motivo: "VEHICULO_NO_ENCONTRADO",
        } as const;
      }

      if (error.code === "P2003") {
        return {
          actualizado: false,
          motivo: "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO",
        } as const;
      }

      if (error.code === "P2002") {
        return { actualizado: false, motivo: "PATENTE_DUPLICADA" } as const;
      }
    }

    throw error;
  }
}

export async function darDeBajaVehiculoPorId(id: string) {
  const resultado = await prisma.vehiculo.updateMany({
    where: { id },
    data: { activo: false },
  });

  return resultado.count === 1;
}
