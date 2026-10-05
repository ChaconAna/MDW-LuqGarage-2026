import type { EstadoOrdenTrabajo, Prisma } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionOrdenTrabajo = {
  id: true,
  estado: true,
  siniestro: {
    select: {
      id: true,
      numeroSiniestro: true,
    },
  },
} satisfies Prisma.OrdenDeTrabajoSelect;

type DatosOrdenTrabajo = {
  id: string;
  estado: EstadoOrdenTrabajo;
  siniestroId: string;
};

export function asegurarOrdenTrabajoPorId(
  cliente: ClienteTransaccion,
  datos: DatosOrdenTrabajo,
) {
  return cliente.ordenDeTrabajo.upsert({
    where: { id: datos.id },
    update: datos,
    create: datos,
  });
}

export async function listarOrdenesTrabajo(page: number, limit: number) {
  const [ordenesTrabajo, total] = await prisma.$transaction([
    prisma.ordenDeTrabajo.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionOrdenTrabajo,
    }),
    prisma.ordenDeTrabajo.count(),
  ]);

  return { ordenesTrabajo, total };
}
