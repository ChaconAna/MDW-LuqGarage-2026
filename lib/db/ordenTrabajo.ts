import type { EstadoOrdenTrabajo, Prisma } from "@prisma/client";

import type { DatosCreacionOrdenTrabajo } from "../schemas/ordenTrabajo";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";
import { ejecutarTransaccion } from "./transaccion";

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

const seleccionDetalleOrdenTrabajo = {
  ...seleccionOrdenTrabajo,
  presupuestos: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      numeroPresupuesto: true,
      estado: true,
      reparaciones: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          reparacion: {
            select: {
              id: true,
              nombre: true,
              sector: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  },
  sectores: {
    orderBy: { sectorId: "asc" },
    select: {
      observacion: true,
      sector: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
} satisfies Prisma.OrdenDeTrabajoSelect;

export type DetalleOrdenTrabajo = Prisma.OrdenDeTrabajoGetPayload<{
  select: typeof seleccionDetalleOrdenTrabajo;
}>;

class ErrorAsociacionCondicionadaPresupuestos extends Error {
  constructor() {
    super("No fue posible asociar todos los Presupuestos seleccionados.");
    this.name = "ErrorAsociacionCondicionadaPresupuestos";
  }
}

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

export function obtenerOrdenTrabajoPorId(id: string) {
  return prisma.ordenDeTrabajo.findUnique({
    where: { id },
    select: seleccionDetalleOrdenTrabajo,
  });
}

export async function crearOrdenTrabajo(datos: DatosCreacionOrdenTrabajo) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const siniestro = await cliente.siniestro.findUnique({
        where: { id: datos.siniestroId },
        select: { id: true },
      });

      if (!siniestro) {
        return { creada: false, motivo: "SINIESTRO_NO_ENCONTRADO" } as const;
      }

      const presupuestos = await cliente.presupuesto.findMany({
        where: { id: { in: datos.presupuestoIds } },
        select: {
          id: true,
          estado: true,
          siniestroId: true,
          ordenTrabajoId: true,
          reparaciones: {
            select: {
              reparacion: {
                select: { sectorId: true },
              },
            },
          },
        },
      });

      if (presupuestos.length !== datos.presupuestoIds.length) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_NO_ENCONTRADO",
        } as const;
      }

      if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_NO_APROBADO",
        } as const;
      }

      if (
        presupuestos.some(
          ({ siniestroId }) => siniestroId !== datos.siniestroId,
        )
      ) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_OTRO_SINIESTRO",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)
      ) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_YA_ASOCIADO",
        } as const;
      }

      const sectorIds = [
        ...new Set(
          presupuestos.flatMap(({ reparaciones }) =>
            reparaciones.map(({ reparacion }) => reparacion.sectorId),
          ),
        ),
      ];

      const ordenTrabajo = await cliente.ordenDeTrabajo.create({
        data: {
          estado: "BORRADOR",
          siniestroId: datos.siniestroId,
        },
        select: { id: true },
      });

      const asociacion = await cliente.presupuesto.updateMany({
        where: {
          id: { in: datos.presupuestoIds },
          estado: "APROBADO",
          siniestroId: datos.siniestroId,
          ordenTrabajoId: null,
        },
        data: { ordenTrabajoId: ordenTrabajo.id },
      });

      if (asociacion.count !== datos.presupuestoIds.length) {
        throw new ErrorAsociacionCondicionadaPresupuestos();
      }

      if (sectorIds.length > 0) {
        await cliente.ordenTrabajoSector.createMany({
          data: sectorIds.map((sectorId) => ({
            ordenTrabajoId: ordenTrabajo.id,
            sectorId,
            observacion: null,
          })),
        });
      }

      const detalle = await cliente.ordenDeTrabajo.findUniqueOrThrow({
        where: { id: ordenTrabajo.id },
        select: seleccionDetalleOrdenTrabajo,
      });

      return { creada: true, ordenTrabajo: detalle } as const;
    });
  } catch (error: unknown) {
    if (error instanceof ErrorAsociacionCondicionadaPresupuestos) {
      const [siniestro, presupuestos] = await Promise.all([
        prisma.siniestro.findUnique({
          where: { id: datos.siniestroId },
          select: { id: true },
        }),
        prisma.presupuesto.findMany({
          where: { id: { in: datos.presupuestoIds } },
          select: {
            estado: true,
            siniestroId: true,
            ordenTrabajoId: true,
          },
        }),
      ]);

      if (!siniestro) {
        return { creada: false, motivo: "SINIESTRO_NO_ENCONTRADO" } as const;
      }

      if (presupuestos.length !== datos.presupuestoIds.length) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_NO_ENCONTRADO",
        } as const;
      }

      if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_NO_APROBADO",
        } as const;
      }

      if (
        presupuestos.some(
          ({ siniestroId }) => siniestroId !== datos.siniestroId,
        )
      ) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_OTRO_SINIESTRO",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)
      ) {
        return {
          creada: false,
          motivo: "PRESUPUESTO_YA_ASOCIADO",
        } as const;
      }
    }

    throw error;
  }
}
