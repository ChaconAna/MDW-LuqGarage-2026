import { describe, expect, it } from "vitest";

import type { DetalleOrdenTrabajo } from "../db/ordenTrabajo";
import {
  evaluarElegibilidadEdicionObservaciones,
  evaluarElegibilidadFinalizacionOrdenTrabajo,
  evaluarElegibilidadIncorporacionPresupuestos,
  evaluarElegibilidadPresupuestosParaCrearOrden,
  serializarDetalleOrdenTrabajo,
} from "./ordenTrabajo";

type PresupuestoDetalle = DetalleOrdenTrabajo["presupuestos"][number];
type SectorDetalle = DetalleOrdenTrabajo["sectores"][number];

const siniestroId = "10000000-0000-4000-8000-000000000001";
const otroSiniestroId = "10000000-0000-4000-8000-000000000002";
const ordenTrabajoId = "40000000-0000-4000-8000-000000000001";
const otraOrdenTrabajoId = "40000000-0000-4000-8000-000000000002";
const sectorId1 = "50000000-0000-4000-8000-000000000001";
const sectorId2 = "50000000-0000-4000-8000-000000000002";
const sectorId3 = "50000000-0000-4000-8000-000000000003";

describe("evaluarElegibilidadPresupuestosParaCrearOrden", () => {
  it("acepta Presupuestos aprobados, del Siniestro indicado y sin OT", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [
        { estado: "APROBADO", siniestroId, ordenTrabajoId: null },
        { estado: "APROBADO", siniestroId, ordenTrabajoId: null },
      ],
    );

    expect(resultado).toBeNull();
  });

  it("rechaza un conjunto con un Presupuesto no aprobado", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [
        { estado: "APROBADO", siniestroId, ordenTrabajoId: null },
        { estado: "ENVIADO", siniestroId, ordenTrabajoId: null },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });

  it("distingue un Presupuesto perteneciente a otro Siniestro", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [
        {
          estado: "APROBADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId: null,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_OTRO_SINIESTRO");
  });

  it("distingue un Presupuesto ya asociado a una OT", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [{ estado: "APROBADO", siniestroId, ordenTrabajoId }],
    );

    expect(resultado).toBe("PRESUPUESTO_YA_ASOCIADO");
  });

  it("prioriza el estado no aprobado sobre los demÃ¡s conflictos", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [
        {
          estado: "ENVIADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });

  it("prioriza otro Siniestro sobre la asociaciÃ³n previa", () => {
    const resultado = evaluarElegibilidadPresupuestosParaCrearOrden(
      siniestroId,
      [
        {
          estado: "APROBADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_OTRO_SINIESTRO");
  });
});

describe("evaluarElegibilidadEdicionObservaciones", () => {
  it("acepta una OT BORRADOR cuando todos los Sectores pertenecen", () => {
    const resultado = evaluarElegibilidadEdicionObservaciones("BORRADOR", {
      sectorIdsSolicitados: [sectorId1, sectorId2],
      sectorIdsOrdenTrabajo: [sectorId1, sectorId2, sectorId3],
    });

    expect(resultado).toBeNull();
  });

  it("rechaza una OT FINALIZADA", () => {
    const resultado = evaluarElegibilidadEdicionObservaciones("FINALIZADA", {
      sectorIdsSolicitados: [sectorId1],
      sectorIdsOrdenTrabajo: [sectorId1],
    });

    expect(resultado).toBe("ORDEN_TRABAJO_NO_EDITABLE");
  });

  it("rechaza cuando exactamente un Sector solicitado no pertenece", () => {
    const resultado = evaluarElegibilidadEdicionObservaciones("BORRADOR", {
      sectorIdsSolicitados: [sectorId1, sectorId2],
      sectorIdsOrdenTrabajo: [sectorId1],
    });

    expect(resultado).toBe("SECTOR_NO_PERTENECE");
  });

  it("prioriza la OT no editable sobre un Sector ajeno", () => {
    const resultado = evaluarElegibilidadEdicionObservaciones("FINALIZADA", {
      sectorIdsSolicitados: [sectorId2],
      sectorIdsOrdenTrabajo: [sectorId1],
    });

    expect(resultado).toBe("ORDEN_TRABAJO_NO_EDITABLE");
  });
});

describe("evaluarElegibilidadIncorporacionPresupuestos", () => {
  const ordenTrabajo = {
    id: ordenTrabajoId,
    estado: "BORRADOR" as const,
    siniestroId,
  };

  it("acepta Presupuestos aprobados, del mismo Siniestro y libres", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [
        { estado: "APROBADO", siniestroId, ordenTrabajoId: null },
        { estado: "APROBADO", siniestroId, ordenTrabajoId: null },
      ],
    );

    expect(resultado).toBeNull();
  });

  it("rechaza un Presupuesto no aprobado", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [{ estado: "ENVIADO", siniestroId, ordenTrabajoId: null }],
    );

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });

  it("distingue un Presupuesto que ya pertenece a esta OT", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [{ estado: "APROBADO", siniestroId, ordenTrabajoId }],
    );

    expect(resultado).toBe("PRESUPUESTO_YA_PERTENECE");
  });

  it("distingue un Presupuesto asociado a otra OT", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [{ estado: "APROBADO", siniestroId, ordenTrabajoId: otraOrdenTrabajoId }],
    );

    expect(resultado).toBe("PRESUPUESTO_YA_ASOCIADO");
  });

  it("distingue un Presupuesto perteneciente a otro Siniestro", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [
        {
          estado: "APROBADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId: null,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_OTRO_SINIESTRO");
  });

  it("prioriza la OT no editable sobre los conflictos de Presupuesto", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      { ...ordenTrabajo, estado: "FINALIZADA" },
      [
        {
          estado: "ENVIADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("ORDEN_TRABAJO_NO_EDITABLE");
  });

  it("prioriza el estado no aprobado sobre los demas conflictos", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [
        {
          estado: "ENVIADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });

  it("prioriza otro Siniestro sobre una asociacion previa", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [
        {
          estado: "APROBADO",
          siniestroId: otroSiniestroId,
          ordenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_OTRO_SINIESTRO");
  });

  it("prioriza la pertenencia a esta OT sobre la asociacion a otra", () => {
    const resultado = evaluarElegibilidadIncorporacionPresupuestos(
      ordenTrabajo,
      [
        { estado: "APROBADO", siniestroId, ordenTrabajoId },
        {
          estado: "APROBADO",
          siniestroId,
          ordenTrabajoId: otraOrdenTrabajoId,
        },
      ],
    );

    expect(resultado).toBe("PRESUPUESTO_YA_PERTENECE");
  });
});

describe("evaluarElegibilidadFinalizacionOrdenTrabajo", () => {
  it("acepta una OT BORRADOR con Presupuesto aprobado y cobertura completa", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [
        {
          estado: "APROBADO",
          sectorIdsRequeridos: [sectorId1, sectorId2],
        },
      ],
      sectorIdsOrdenTrabajo: [sectorId1, sectorId2],
    });

    expect(resultado).toBeNull();
  });

  it("rechaza una OT que no esta en BORRADOR", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo(
      "FINALIZADA",
      null,
    );

    expect(resultado).toBe("ORDEN_TRABAJO_NO_EDITABLE");
  });

  it("rechaza una OT sin Presupuestos", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [],
      sectorIdsOrdenTrabajo: [],
    });

    expect(resultado).toBe("ORDEN_TRABAJO_SIN_PRESUPUESTOS");
  });

  it("rechaza una OT con un Presupuesto no aprobado", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [{ estado: "ENVIADO", sectorIdsRequeridos: [] }],
      sectorIdsOrdenTrabajo: [],
    });

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });

  it("rechaza cuando falta exactamente un Sector requerido", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [
        {
          estado: "APROBADO",
          sectorIdsRequeridos: [sectorId1, sectorId2],
        },
      ],
      sectorIdsOrdenTrabajo: [sectorId1],
    });

    expect(resultado).toBe("REPARACIONES_SIN_SECTORIZAR");
  });

  it("acepta Sectores asociados adicionales", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [
        { estado: "APROBADO", sectorIdsRequeridos: [sectorId1] },
      ],
      sectorIdsOrdenTrabajo: [sectorId1, sectorId2],
    });

    expect(resultado).toBeNull();
  });

  it("prioriza un Presupuesto no aprobado sobre la falta de Sectores", () => {
    const resultado = evaluarElegibilidadFinalizacionOrdenTrabajo("BORRADOR", {
      presupuestos: [
        { estado: "ENVIADO", sectorIdsRequeridos: [sectorId2] },
      ],
      sectorIdsOrdenTrabajo: [sectorId1],
    });

    expect(resultado).toBe("PRESUPUESTO_NO_APROBADO");
  });
});

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
