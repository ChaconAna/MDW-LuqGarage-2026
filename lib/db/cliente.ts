import { Prisma } from "@prisma/client";

import type {
  DatosActualizacionCliente,
  DatosCreacionCliente,
} from "../schemas/cliente";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionCliente = {
  id: true,
  nombre: true,
  apellido: true,
  dni: true,
  telefono: true,
  email: true,
  direccion: true,
  activo: true,
  localidad: {
    select: {
      id: true,
      nombre: true,
      provincia: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
} satisfies Prisma.ClienteSelect;

type DatosCliente = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
  localidadId: string;
};

export function asegurarClientePorDni(
  cliente: ClienteTransaccion,
  datos: DatosCliente,
) {
  return cliente.cliente.upsert({
    where: { dni: datos.dni },
    update: datos,
    create: datos,
  });
}

export function obtenerClientePorId(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    select: seleccionCliente,
  });
}

export async function listarClientes(page: number, limit: number) {
  const [clientes, total] = await prisma.$transaction([
    prisma.cliente.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionCliente,
    }),
    prisma.cliente.count(),
  ]);

  return { clientes, total };
}

export async function crearCliente(datos: DatosCreacionCliente) {
  try {
    const cliente = await prisma.cliente.create({
      data: {
        ...datos,
        activo: true,
      },
      select: seleccionCliente,
    });

    return { creado: true, cliente } as const;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { creado: false, motivo: "DNI_DUPLICADO" } as const;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { creado: false, motivo: "LOCALIDAD_NO_ENCONTRADA" } as const;
    }

    throw error;
  }
}

export async function actualizarClientePorId(
  id: string,
  datos: DatosActualizacionCliente,
) {
  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: datos,
      select: seleccionCliente,
    });

    return { actualizado: true, cliente } as const;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          actualizado: false,
          motivo: "CLIENTE_NO_ENCONTRADO",
        } as const;
      }

      if (error.code === "P2003") {
        return {
          actualizado: false,
          motivo: "LOCALIDAD_NO_ENCONTRADA",
        } as const;
      }

      if (error.code === "P2002") {
        return { actualizado: false, motivo: "DNI_DUPLICADO" } as const;
      }
    }

    throw error;
  }
}
