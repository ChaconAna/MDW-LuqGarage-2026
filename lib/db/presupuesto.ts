import type { EstadoPresupuesto, Prisma } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionPresupuesto = {
  id: true,
  numeroPresupuesto: true,
  estado: true,
  siniestro: {
    select: {
      id: true,
      numeroSiniestro: true,
    },
  },
} satisfies Prisma.PresupuestoSelect;

const seleccionDetallePresupuesto = {
  ...seleccionPresupuesto,
  reparaciones: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      costo: true,
      reparacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  repuestos: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      cantidad: true,
      repuesto: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
} satisfies Prisma.PresupuestoSelect;

type DatosPresupuesto = {
  numeroPresupuesto: string;
  estado: EstadoPresupuesto;
  siniestroId: string;
  ordenTrabajoId: string | null;
};

export function asegurarPresupuestoPorNumero(
  cliente: ClienteTransaccion,
  datos: DatosPresupuesto,
) {
  return cliente.presupuesto.upsert({
    where: { numeroPresupuesto: datos.numeroPresupuesto },
    update: datos,
    create: datos,
  });
}

export async function listarPresupuestos(page: number, limit: number) {
  const [presupuestos, total] = await prisma.$transaction([
    prisma.presupuesto.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionPresupuesto,
    }),
    prisma.presupuesto.count(),
  ]);

  return { presupuestos, total };
}

export function obtenerPresupuestoPorId(id: string) {
  return prisma.presupuesto.findUnique({
    where: { id },
    select: seleccionDetallePresupuesto,
  });
}
