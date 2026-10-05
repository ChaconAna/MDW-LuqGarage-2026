import type { DetalleOrdenTrabajo } from "../db/ordenTrabajo";

type EstadoPresupuestoOrdenTrabajo =
  DetalleOrdenTrabajo["presupuestos"][number]["estado"];
type EstadoOrdenTrabajo = DetalleOrdenTrabajo["estado"];

type PresupuestoParaCrearOrden = {
  estado: EstadoPresupuestoOrdenTrabajo;
  siniestroId: string;
  ordenTrabajoId: string | null;
};

type MotivoPresupuestoNoElegible =
  | "PRESUPUESTO_NO_APROBADO"
  | "PRESUPUESTO_OTRO_SINIESTRO"
  | "PRESUPUESTO_YA_ASOCIADO";

export function evaluarElegibilidadPresupuestosParaCrearOrden(
  siniestroId: string,
  presupuestos: readonly PresupuestoParaCrearOrden[],
): MotivoPresupuestoNoElegible | null {
  if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
    return "PRESUPUESTO_NO_APROBADO";
  }

  if (
    presupuestos.some(
      (presupuesto) => presupuesto.siniestroId !== siniestroId,
    )
  ) {
    return "PRESUPUESTO_OTRO_SINIESTRO";
  }

  if (presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)) {
    return "PRESUPUESTO_YA_ASOCIADO";
  }

  return null;
}

type SectoresParaEditarObservaciones = {
  sectorIdsSolicitados: readonly string[];
  sectorIdsOrdenTrabajo: readonly string[];
};

type MotivoEdicionObservaciones =
  | "ORDEN_TRABAJO_NO_EDITABLE"
  | "SECTOR_NO_PERTENECE";

export function evaluarElegibilidadEdicionObservaciones(
  estado: EstadoOrdenTrabajo,
  sectores: SectoresParaEditarObservaciones | null,
): MotivoEdicionObservaciones | null {
  if (estado !== "BORRADOR") {
    return "ORDEN_TRABAJO_NO_EDITABLE";
  }

  if (sectores === null) {
    return null;
  }

  const sectorIdsOrdenTrabajo = new Set(sectores.sectorIdsOrdenTrabajo);
  const haySectorAjeno = sectores.sectorIdsSolicitados.some(
    (sectorId) => !sectorIdsOrdenTrabajo.has(sectorId),
  );

  return haySectorAjeno ? "SECTOR_NO_PERTENECE" : null;
}

type OrdenTrabajoParaIncorporarPresupuestos = {
  id: string;
  estado: EstadoOrdenTrabajo;
  siniestroId: string;
};

type PresupuestoParaIncorporar = PresupuestoParaCrearOrden;

type MotivoIncorporacionPresupuesto =
  | "ORDEN_TRABAJO_NO_EDITABLE"
  | "PRESUPUESTO_NO_APROBADO"
  | "PRESUPUESTO_OTRO_SINIESTRO"
  | "PRESUPUESTO_YA_PERTENECE"
  | "PRESUPUESTO_YA_ASOCIADO";

export function evaluarElegibilidadIncorporacionPresupuestos(
  ordenTrabajo: OrdenTrabajoParaIncorporarPresupuestos,
  presupuestos: readonly PresupuestoParaIncorporar[] | null,
): MotivoIncorporacionPresupuesto | null {
  if (ordenTrabajo.estado !== "BORRADOR") {
    return "ORDEN_TRABAJO_NO_EDITABLE";
  }

  if (presupuestos === null) {
    return null;
  }

  if (presupuestos.some(({ estado }) => estado !== "APROBADO")) {
    return "PRESUPUESTO_NO_APROBADO";
  }

  if (
    presupuestos.some(
      ({ siniestroId }) => siniestroId !== ordenTrabajo.siniestroId,
    )
  ) {
    return "PRESUPUESTO_OTRO_SINIESTRO";
  }

  if (
    presupuestos.some(
      ({ ordenTrabajoId }) => ordenTrabajoId === ordenTrabajo.id,
    )
  ) {
    return "PRESUPUESTO_YA_PERTENECE";
  }

  if (presupuestos.some(({ ordenTrabajoId }) => ordenTrabajoId !== null)) {
    return "PRESUPUESTO_YA_ASOCIADO";
  }

  return null;
}

type PresupuestoParaFinalizarOrden = {
  estado: EstadoPresupuestoOrdenTrabajo;
  sectorIdsRequeridos: readonly string[];
};

type ComposicionParaFinalizarOrden = {
  presupuestos: readonly PresupuestoParaFinalizarOrden[];
  sectorIdsOrdenTrabajo: readonly string[];
};

type MotivoFinalizacionOrdenTrabajo =
  | "ORDEN_TRABAJO_NO_EDITABLE"
  | "ORDEN_TRABAJO_SIN_PRESUPUESTOS"
  | "PRESUPUESTO_NO_APROBADO"
  | "REPARACIONES_SIN_SECTORIZAR";

export function evaluarElegibilidadFinalizacionOrdenTrabajo(
  estado: EstadoOrdenTrabajo,
  composicion: ComposicionParaFinalizarOrden | null,
): MotivoFinalizacionOrdenTrabajo | null {
  if (estado !== "BORRADOR") {
    return "ORDEN_TRABAJO_NO_EDITABLE";
  }

  if (composicion === null) {
    return null;
  }

  if (composicion.presupuestos.length === 0) {
    return "ORDEN_TRABAJO_SIN_PRESUPUESTOS";
  }

  if (composicion.presupuestos.some(({ estado }) => estado !== "APROBADO")) {
    return "PRESUPUESTO_NO_APROBADO";
  }

  const sectorIdsOrdenTrabajo = new Set(composicion.sectorIdsOrdenTrabajo);
  const hayReparacionSinSectorizar = composicion.presupuestos.some(
    ({ sectorIdsRequeridos }) =>
      sectorIdsRequeridos.some(
        (sectorId) => !sectorIdsOrdenTrabajo.has(sectorId),
      ),
  );

  return hayReparacionSinSectorizar ? "REPARACIONES_SIN_SECTORIZAR" : null;
}

type ReparacionOrdenTrabajo = {
  detalleReparacionId: string;
  presupuestoId: string;
  reparacion: {
    id: string;
    nombre: string;
  };
};

type SectorOrdenTrabajo = {
  id: string;
  nombre: string;
  observacion: string | null;
  reparaciones: ReparacionOrdenTrabajo[];
};

export function serializarDetalleOrdenTrabajo(
  ordenTrabajo: DetalleOrdenTrabajo,
) {
  const sectoresPorId = new Map<string, SectorOrdenTrabajo>();

  for (const relacion of ordenTrabajo.sectores) {
    sectoresPorId.set(relacion.sector.id, {
      id: relacion.sector.id,
      nombre: relacion.sector.nombre,
      observacion: relacion.observacion,
      reparaciones: [],
    });
  }

  const presupuestos = [...ordenTrabajo.presupuestos].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const presupuesto of presupuestos) {
    const reparaciones = [...presupuesto.reparaciones].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    for (const detalle of reparaciones) {
      const { sector } = detalle.reparacion;
      let sectorOrganizado = sectoresPorId.get(sector.id);

      if (!sectorOrganizado) {
        sectorOrganizado = {
          id: sector.id,
          nombre: sector.nombre,
          observacion: null,
          reparaciones: [],
        };
        sectoresPorId.set(sector.id, sectorOrganizado);
      }

      sectorOrganizado.reparaciones.push({
        detalleReparacionId: detalle.id,
        presupuestoId: presupuesto.id,
        reparacion: {
          id: detalle.reparacion.id,
          nombre: detalle.reparacion.nombre,
        },
      });
    }
  }

  const sectores = [...sectoresPorId.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((sector) => ({
      ...sector,
      reparaciones: [...sector.reparaciones].sort((a, b) =>
        a.detalleReparacionId.localeCompare(b.detalleReparacionId),
      ),
    }));

  return {
    id: ordenTrabajo.id,
    estado: ordenTrabajo.estado,
    siniestro: ordenTrabajo.siniestro,
    presupuestos: presupuestos.map((presupuesto) => ({
      id: presupuesto.id,
      numeroPresupuesto: presupuesto.numeroPresupuesto,
      estado: presupuesto.estado,
    })),
    sectores,
  };
}
