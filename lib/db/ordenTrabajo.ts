import type { EstadoOrdenTrabajo, Prisma } from "@prisma/client";

import type {
  DatosActualizacionObservacionesOrdenTrabajo,
  DatosCreacionOrdenTrabajo,
  DatosIncorporacionPresupuestosOrdenTrabajo,
} from "../schemas/ordenTrabajo";
import type { ClienteTransaccion } from "./transaccion";

import { evaluarElegibilidadPresupuestosParaCrearOrden } from "../services/ordenTrabajo";
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

class ErrorActualizacionCondicionadaOrdenTrabajo extends Error {
  constructor() {
    super("La Orden de Trabajo dejó de estar en estado BORRADOR.");
    this.name = "ErrorActualizacionCondicionadaOrdenTrabajo";
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

      const motivoPresupuestoNoElegible =
        evaluarElegibilidadPresupuestosParaCrearOrden(
          datos.siniestroId,
          presupuestos,
        );

      if (motivoPresupuestoNoElegible) {
        return {
          creada: false,
          motivo: motivoPresupuestoNoElegible,
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

      const motivoPresupuestoNoElegible =
        evaluarElegibilidadPresupuestosParaCrearOrden(
          datos.siniestroId,
          presupuestos,
        );

      if (motivoPresupuestoNoElegible) {
        return {
          creada: false,
          motivo: motivoPresupuestoNoElegible,
        } as const;
      }
    }

    throw error;
  }
}

export async function actualizarObservacionesOrdenTrabajoPorId(
  id: string,
  datos: DatosActualizacionObservacionesOrdenTrabajo,
) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const ordenTrabajoActual = await cliente.ordenDeTrabajo.findUnique({
        where: { id },
        select: { estado: true },
      });

      if (!ordenTrabajoActual) {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }

      const sectorIds = datos.sectores.map(({ sectorId }) => sectorId);
      const sectores = await cliente.sector.findMany({
        where: { id: { in: sectorIds } },
        select: { id: true },
      });

      if (sectores.length !== sectorIds.length) {
        return {
          actualizada: false,
          motivo: "SECTOR_NO_ENCONTRADO",
        } as const;
      }

      const sectoresOrdenTrabajo = await cliente.ordenTrabajoSector.findMany({
        where: {
          ordenTrabajoId: id,
          sectorId: { in: sectorIds },
        },
        select: { sectorId: true },
      });

      if (sectoresOrdenTrabajo.length !== sectorIds.length) {
        return {
          actualizada: false,
          motivo: "SECTOR_NO_PERTENECE",
        } as const;
      }

      const proteccionBorrador = await cliente.ordenDeTrabajo.updateMany({
        where: {
          id,
          estado: "BORRADOR",
        },
        data: { estado: "BORRADOR" },
      });

      if (proteccionBorrador.count !== 1) {
        throw new ErrorActualizacionCondicionadaOrdenTrabajo();
      }

      for (const { sectorId, observacion } of datos.sectores) {
        await cliente.ordenTrabajoSector.update({
          where: {
            ordenTrabajoId_sectorId: {
              ordenTrabajoId: id,
              sectorId,
            },
          },
          data: { observacion },
        });
      }

      const ordenTrabajo = await cliente.ordenDeTrabajo.findUniqueOrThrow({
        where: { id },
        select: seleccionDetalleOrdenTrabajo,
      });

      return { actualizada: true, ordenTrabajo } as const;
    });
  } catch (error: unknown) {
    if (error instanceof ErrorActualizacionCondicionadaOrdenTrabajo) {
      const ordenTrabajoActual = await prisma.ordenDeTrabajo.findUnique({
        where: { id },
        select: { estado: true },
      });

      if (!ordenTrabajoActual) {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }
    }

    throw error;
  }
}

export async function agregarPresupuestosOrdenTrabajoPorId(
  id: string,
  datos: DatosIncorporacionPresupuestosOrdenTrabajo,
) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const ordenTrabajoActual = await cliente.ordenDeTrabajo.findUnique({
        where: { id },
        select: {
          estado: true,
          siniestroId: true,
        },
      });

      if (!ordenTrabajoActual) {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }

      const presupuestos = await cliente.presupuesto.findMany({
        where: { id: { in: datos.presupuestoIds } },
        select: {
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
          actualizada: false,
          motivo: "PRESUPUESTO_NO_ENCONTRADO",
        } as const;
      }

      if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_NO_APROBADO",
        } as const;
      }

      if (
        presupuestos.some(
          ({ siniestroId }) => siniestroId !== ordenTrabajoActual.siniestroId,
        )
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_OTRO_SINIESTRO",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId === id)
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_YA_PERTENECE",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_YA_ASOCIADO",
        } as const;
      }

      const sectorIdsNecesarios = [
        ...new Set(
          presupuestos.flatMap(({ reparaciones }) =>
            reparaciones.map(({ reparacion }) => reparacion.sectorId),
          ),
        ),
      ];

      const proteccionBorrador = await cliente.ordenDeTrabajo.updateMany({
        where: {
          id,
          estado: "BORRADOR",
        },
        data: { estado: "BORRADOR" },
      });

      if (proteccionBorrador.count !== 1) {
        throw new ErrorActualizacionCondicionadaOrdenTrabajo();
      }

      const asociacion = await cliente.presupuesto.updateMany({
        where: {
          id: { in: datos.presupuestoIds },
          estado: "APROBADO",
          siniestroId: ordenTrabajoActual.siniestroId,
          ordenTrabajoId: null,
        },
        data: { ordenTrabajoId: id },
      });

      if (asociacion.count !== datos.presupuestoIds.length) {
        throw new ErrorAsociacionCondicionadaPresupuestos();
      }

      const sectoresExistentes = await cliente.ordenTrabajoSector.findMany({
        where: {
          ordenTrabajoId: id,
          sectorId: { in: sectorIdsNecesarios },
        },
        select: { sectorId: true },
      });
      const sectorIdsExistentes = new Set(
        sectoresExistentes.map(({ sectorId }) => sectorId),
      );
      const sectorIdsFaltantes = sectorIdsNecesarios.filter(
        (sectorId) => !sectorIdsExistentes.has(sectorId),
      );

      if (sectorIdsFaltantes.length > 0) {
        await cliente.ordenTrabajoSector.createMany({
          data: sectorIdsFaltantes.map((sectorId) => ({
            ordenTrabajoId: id,
            sectorId,
            observacion: null,
          })),
        });
      }

      const ordenTrabajo = await cliente.ordenDeTrabajo.findUniqueOrThrow({
        where: { id },
        select: seleccionDetalleOrdenTrabajo,
      });

      return { actualizada: true, ordenTrabajo } as const;
    });
  } catch (error: unknown) {
    if (
      error instanceof ErrorActualizacionCondicionadaOrdenTrabajo ||
      error instanceof ErrorAsociacionCondicionadaPresupuestos
    ) {
      const [ordenTrabajoActual, presupuestos] = await Promise.all([
        prisma.ordenDeTrabajo.findUnique({
          where: { id },
          select: {
            estado: true,
            siniestroId: true,
          },
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

      if (!ordenTrabajoActual) {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          actualizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }

      if (presupuestos.length !== datos.presupuestoIds.length) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_NO_ENCONTRADO",
        } as const;
      }

      if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_NO_APROBADO",
        } as const;
      }

      if (
        presupuestos.some(
          ({ siniestroId }) => siniestroId !== ordenTrabajoActual.siniestroId,
        )
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_OTRO_SINIESTRO",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId === id)
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_YA_PERTENECE",
        } as const;
      }

      if (
        presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)
      ) {
        return {
          actualizada: false,
          motivo: "PRESUPUESTO_YA_ASOCIADO",
        } as const;
      }
    }

    throw error;
  }
}

export async function finalizarOrdenTrabajoPorId(id: string) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const ordenTrabajoActual = await cliente.ordenDeTrabajo.findUnique({
        where: { id },
        select: { estado: true },
      });

      if (!ordenTrabajoActual) {
        return {
          finalizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          finalizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }

      const proteccionBorrador = await cliente.ordenDeTrabajo.updateMany({
        where: {
          id,
          estado: "BORRADOR",
        },
        data: { estado: "BORRADOR" },
      });

      if (proteccionBorrador.count !== 1) {
        throw new ErrorActualizacionCondicionadaOrdenTrabajo();
      }

      const composicion = await cliente.ordenDeTrabajo.findUniqueOrThrow({
        where: { id },
        select: {
          presupuestos: {
            select: {
              estado: true,
              reparaciones: {
                select: {
                  reparacion: {
                    select: { sectorId: true },
                  },
                },
              },
            },
          },
          sectores: {
            select: { sectorId: true },
          },
        },
      });

      if (composicion.presupuestos.length === 0) {
        return {
          finalizada: false,
          motivo: "ORDEN_TRABAJO_SIN_PRESUPUESTOS",
        } as const;
      }

      if (
        composicion.presupuestos.some(({ estado }) => estado !== "APROBADO")
      ) {
        return {
          finalizada: false,
          motivo: "PRESUPUESTO_NO_APROBADO",
        } as const;
      }

      const sectorIdsOrdenTrabajo = new Set(
        composicion.sectores.map(({ sectorId }) => sectorId),
      );
      const hayReparacionesSinSectorizar = composicion.presupuestos.some(
        ({ reparaciones }) =>
          reparaciones.some(
            ({ reparacion }) =>
              !sectorIdsOrdenTrabajo.has(reparacion.sectorId),
          ),
      );

      if (hayReparacionesSinSectorizar) {
        return {
          finalizada: false,
          motivo: "REPARACIONES_SIN_SECTORIZAR",
        } as const;
      }

      const transicion = await cliente.ordenDeTrabajo.updateMany({
        where: {
          id,
          estado: "BORRADOR",
        },
        data: { estado: "FINALIZADA" },
      });

      if (transicion.count !== 1) {
        throw new ErrorActualizacionCondicionadaOrdenTrabajo();
      }

      const ordenTrabajo = await cliente.ordenDeTrabajo.findUniqueOrThrow({
        where: { id },
        select: seleccionDetalleOrdenTrabajo,
      });

      return { finalizada: true, ordenTrabajo } as const;
    });
  } catch (error: unknown) {
    if (error instanceof ErrorActualizacionCondicionadaOrdenTrabajo) {
      const ordenTrabajoActual = await prisma.ordenDeTrabajo.findUnique({
        where: { id },
        select: { estado: true },
      });

      if (!ordenTrabajoActual) {
        return {
          finalizada: false,
          motivo: "ORDEN_TRABAJO_NO_ENCONTRADA",
        } as const;
      }

      if (ordenTrabajoActual.estado !== "BORRADOR") {
        return {
          finalizada: false,
          motivo: "ORDEN_TRABAJO_NO_EDITABLE",
        } as const;
      }
    }

    throw error;
  }
}
