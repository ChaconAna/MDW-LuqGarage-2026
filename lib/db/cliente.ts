import type { Prisma } from "@prisma/client";

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
