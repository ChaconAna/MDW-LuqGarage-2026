import { Prisma } from "@prisma/client";
import type { EstadoPresupuesto } from "@prisma/client";

import type { DatosCreacionPresupuesto } from "../schemas/presupuesto";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";
import { ejecutarTransaccion } from "./transaccion";

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

export type DetallePresupuesto = Prisma.PresupuestoGetPayload<{
  select: typeof seleccionDetallePresupuesto;
}>;

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

export async function crearPresupuesto(datos: DatosCreacionPresupuesto) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const siniestro = await cliente.siniestro.findUnique({
        where: { id: datos.siniestroId },
        select: { id: true },
      });

      if (!siniestro) {
        return { creado: false, motivo: "SINIESTRO_NO_ENCONTRADO" } as const;
      }

      const [reparaciones, repuestos] = await Promise.all([
        cliente.reparacion.findMany({
          where: {
            id: { in: datos.reparaciones.map(({ reparacionId }) => reparacionId) },
          },
          select: { id: true },
        }),
        cliente.repuesto.findMany({
          where: {
            id: { in: datos.repuestos.map(({ repuestoId }) => repuestoId) },
          },
          select: { id: true },
        }),
      ]);

      if (reparaciones.length !== datos.reparaciones.length) {
        return { creado: false, motivo: "REPARACION_NO_ENCONTRADA" } as const;
      }

      if (repuestos.length !== datos.repuestos.length) {
        return { creado: false, motivo: "REPUESTO_NO_ENCONTRADO" } as const;
      }

      const presupuesto = await cliente.presupuesto.create({
        data: {
          numeroPresupuesto: datos.numeroPresupuesto,
          estado: "BORRADOR",
          siniestroId: datos.siniestroId,
          reparaciones: {
            create: datos.reparaciones,
          },
          repuestos: {
            create: datos.repuestos,
          },
        },
        select: seleccionDetallePresupuesto,
      });

      await cliente.siniestro.updateMany({
        where: {
          id: datos.siniestroId,
          estado: "REGISTRADO",
        },
        data: { estado: "PRESUPUESTADO" },
      });

      return { creado: true, presupuesto } as const;
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { creado: false, motivo: "NUMERO_DUPLICADO" } as const;
    }

    throw error;
  }
}
