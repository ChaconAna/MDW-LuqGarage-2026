import type { DetalleOrdenTrabajo } from "../db/ordenTrabajo";

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
