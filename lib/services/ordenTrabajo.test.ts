import { describe, expect, it } from "vitest";

import type { DetalleOrdenTrabajo } from "../db/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "./ordenTrabajo";

type PresupuestoDetalle = DetalleOrdenTrabajo["presupuestos"][number];
type SectorDetalle = DetalleOrdenTrabajo["sectores"][number];

function crearOrdenTrabajo(
  presupuestos: PresupuestoDetalle[] = [],
  sectores: SectorDetalle[] = [],
): DetalleOrdenTrabajo {
  return {
    id: "40000000-0000-4000-8000-000000000001",
    estado: "BORRADOR",
    siniestro: {
      id: "10000000-0000-4000-8000-000000000001",
      numeroSiniestro: "SIN-TEST-001",
    },
    presupuestos,
    sectores,
  };
}

function crearPresupuesto(
  id: string,
  numeroPresupuesto: string,
  reparaciones: PresupuestoDetalle["reparaciones"],
): PresupuestoDetalle {
  return {
    id,
    numeroPresupuesto,
    estado: "APROBADO",
    reparaciones,
  };
}

function crearDetalle(
  id: string,
  reparacionId: string,
  reparacionNombre: string,
  sectorId: string,
  sectorNombre: string,
) {
  return {
    id,
    reparacion: {
      id: reparacionId,
      nombre: reparacionNombre,
      sector: {
        id: sectorId,
        nombre: sectorNombre,
      },
    },
  };
}

function crearSector(
  id: string,
  nombre: string,
  observacion: string | null,
): SectorDetalle {
  return {
    observacion,
    sector: { id, nombre },
  };
}

describe("serializarDetalleOrdenTrabajo", () => {
  it("organiza una tarea en su Sector y asocia la observación", () => {
    const presupuesto = crearPresupuesto("presupuesto-1", "PRES-1", [
      crearDetalle(
        "detalle-1",
        "reparacion-1",
        "Reparación 1",
        "sector-1",
        "Sector 1",
      ),
    ]);

    const resultado = serializarDetalleOrdenTrabajo(
      crearOrdenTrabajo(
        [presupuesto],
        [crearSector("sector-1", "Sector 1", "Observación")],
      ),
    );

    expect(resultado.sectores).toEqual([
      {
        id: "sector-1",
        nombre: "Sector 1",
        observacion: "Observación",
        reparaciones: [
          {
            detalleReparacionId: "detalle-1",
            presupuestoId: "presupuesto-1",
            reparacion: {
              id: "reparacion-1",
              nombre: "Reparación 1",
            },
          },
        ],
      },
    ]);
  });

  it("mantiene varias tareas del mismo Sector con observación null", () => {
    const presupuesto = crearPresupuesto("presupuesto-1", "PRES-1", [
      crearDetalle("detalle-2", "reparacion-2", "R2", "sector-1", "S1"),
      crearDetalle("detalle-1", "reparacion-1", "R1", "sector-1", "S1"),
    ]);

    const resultado = serializarDetalleOrdenTrabajo(
      crearOrdenTrabajo(
        [presupuesto],
        [crearSector("sector-1", "S1", null)],
      ),
    );

    expect(resultado.sectores).toHaveLength(1);
    const sector = resultado.sectores[0];

    if (!sector) {
      throw new Error("Se esperaba un Sector organizado.");
    }

    expect(sector.observacion).toBeNull();
    expect(
      sector.reparaciones.map(
        ({ detalleReparacionId }) => detalleReparacionId,
      ),
    ).toEqual(["detalle-1", "detalle-2"]);
  });

  it("separa tareas de Sectores diferentes y las ordena", () => {
    const presupuesto = crearPresupuesto("presupuesto-1", "PRES-1", [
      crearDetalle("detalle-2", "reparacion-2", "R2", "sector-2", "S2"),
      crearDetalle("detalle-1", "reparacion-1", "R1", "sector-1", "S1"),
    ]);

    const resultado = serializarDetalleOrdenTrabajo(
      crearOrdenTrabajo(
        [presupuesto],
        [
          crearSector("sector-2", "S2", null),
          crearSector("sector-1", "S1", null),
        ],
      ),
    );

    expect(resultado.sectores.map(({ id }) => id)).toEqual([
      "sector-1",
      "sector-2",
    ]);
  });

  it("conserva dos ocurrencias de la misma Reparación en Presupuestos diferentes", () => {
    const presupuestos = [
      crearPresupuesto("presupuesto-2", "PRES-2", [
        crearDetalle("detalle-2", "reparacion-1", "R1", "sector-1", "S1"),
      ]),
      crearPresupuesto("presupuesto-1", "PRES-1", [
        crearDetalle("detalle-1", "reparacion-1", "R1", "sector-1", "S1"),
      ]),
    ];

    const resultado = serializarDetalleOrdenTrabajo(
      crearOrdenTrabajo(
        presupuestos,
        [crearSector("sector-1", "S1", null)],
      ),
    );

    expect(resultado.presupuestos.map(({ id }) => id)).toEqual([
      "presupuesto-1",
      "presupuesto-2",
    ]);
    const sector = resultado.sectores[0];

    if (!sector) {
      throw new Error("Se esperaba un Sector organizado.");
    }

    expect(sector.reparaciones).toEqual([
      {
        detalleReparacionId: "detalle-1",
        presupuestoId: "presupuesto-1",
        reparacion: { id: "reparacion-1", nombre: "R1" },
      },
      {
        detalleReparacionId: "detalle-2",
        presupuestoId: "presupuesto-2",
        reparacion: { id: "reparacion-1", nombre: "R1" },
      },
    ]);
  });

  it("devuelve colecciones vacías cuando la OT no tiene tareas", () => {
    const resultado = serializarDetalleOrdenTrabajo(crearOrdenTrabajo());

    expect(resultado.presupuestos).toEqual([]);
    expect(resultado.sectores).toEqual([]);
  });
});
