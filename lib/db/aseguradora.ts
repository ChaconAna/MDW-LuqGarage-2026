import { Prisma } from "@prisma/client";

import type {
  DatosActualizacionAseguradora,
  DatosCreacionAseguradora,
} from "../schemas/aseguradora";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionAseguradora = {
  id: true,
  nombre: true,
  cuit: true,
  telefono: true,
  email: true,
  direccion: true,
  activo: true,
} satisfies Prisma.AseguradoraSelect;

type DatosAseguradora = {
  nombre: string;
  cuit: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
};

export function asegurarAseguradoraPorCuit(
  cliente: ClienteTransaccion,
  datos: DatosAseguradora,
) {
  return cliente.aseguradora.upsert({
    where: { cuit: datos.cuit },
    update: datos,
    create: datos,
  });
}

export function obtenerAseguradoraPorId(id: string) {
  return prisma.aseguradora.findUnique({
    where: { id },
    select: seleccionAseguradora,
  });
}

export async function listarAseguradoras(page: number, limit: number) {
  const [aseguradoras, total] = await prisma.$transaction([
    prisma.aseguradora.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionAseguradora,
    }),
    prisma.aseguradora.count(),
  ]);

  return { aseguradoras, total };
}

export async function crearAseguradora(datos: DatosCreacionAseguradora) {
  try {
    const aseguradora = await prisma.aseguradora.create({
      data: {
        ...datos,
        activo: true,
      },
      select: seleccionAseguradora,
    });

    return { creada: true, aseguradora } as const;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { creada: false, motivo: "CUIT_DUPLICADO" } as const;
    }

    throw error;
  }
}

export async function actualizarAseguradoraPorId(
  id: string,
  datos: DatosActualizacionAseguradora,
) {
  try {
    const aseguradora = await prisma.aseguradora.update({
      where: { id },
      data: datos,
      select: seleccionAseguradora,
    });

    return { actualizada: true, aseguradora } as const;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          actualizada: false,
          motivo: "ASEGURADORA_NO_ENCONTRADA",
        } as const;
      }

      if (error.code === "P2002") {
        return { actualizada: false, motivo: "CUIT_DUPLICADO" } as const;
      }
    }

    throw error;
  }
}

export async function darDeBajaAseguradoraPorId(id: string) {
  const resultado = await prisma.aseguradora.updateMany({
    where: { id },
    data: { activo: false },
  });

  return resultado.count === 1;
}
