import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoPresupuesto } from "@prisma/client";

const d = vi.hoisted(() => ({ transaccion: vi.fn(), siniestro: vi.fn(), presupuestos: vi.fn() }));
vi.mock("./client", () => ({ prisma: { siniestro: { findUnique: d.siniestro }, presupuesto: { findMany: d.presupuestos } } }));
vi.mock("./transaccion", () => ({ ejecutarTransaccion: d.transaccion }));
import { crearOrdenTrabajo } from "./ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "../services/ordenTrabajo";

type PresupuestoSimulado = { id: string; estado: EstadoPresupuesto; siniestroId: string; ordenTrabajoId: string | null; reparaciones: { reparacion: { sectorId: string } }[] };
const siniestroId = "siniestro";
let presupuestos: PresupuestoSimulado[];
let ordenes: { id: string; estado: string; siniestroId: string }[];
let relaciones: { ordenTrabajoId: string; sectorId: string; observacion: null }[];
let siguienteId: number;
let existeSiniestro: boolean;
let antesAsociar: (() => void) | undefined;
let fallaSectores: boolean;
let asociaciones: { where: { id: { in: string[] }; estado: string; siniestroId: string; ordenTrabajoId: null }; data: { ordenTrabajoId: string } }[];
function presupuesto(id: string): PresupuestoSimulado {
  return { id, estado: "APROBADO", siniestroId, ordenTrabajoId: null, reparaciones: [{ reparacion: { sectorId: "pintura" } }] };
}

beforeEach(() => {
  vi.resetAllMocks(); presupuestos = [presupuesto("P1"), presupuesto("P2")]; ordenes = []; relaciones = []; asociaciones = [];
  siguienteId = 0; existeSiniestro = true; antesAsociar = undefined; fallaSectores = false;
  d.siniestro.mockImplementation(async () => existeSiniestro ? { id: siniestroId } : null);
  d.presupuestos.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    presupuestos.filter(({ id }) => where.id.in.includes(id)).map((item) => structuredClone(item)));
  // Transacción en memoria: confirma sólo al terminar, revierte sus asociaciones
  // y conserva las escrituras de otra transacción cuando hay competencia.
  d.transaccion.mockImplementation(async (operacion) => {
    let orden: typeof ordenes[number] | undefined;
    let sectores: typeof relaciones = [];
    const asociadas: string[] = [];
    const cliente = {
      siniestro: { findUnique: d.siniestro },
      presupuesto: {
        findMany: d.presupuestos,
        updateMany: vi.fn(async (entrada: typeof asociaciones[number]) => {
          asociaciones.push(entrada); antesAsociar?.(); antesAsociar = undefined;
          const { where, data } = entrada;
          const elegibles = presupuestos.filter((p) => where.id.in.includes(p.id) && p.estado === where.estado && p.siniestroId === where.siniestroId && p.ordenTrabajoId === where.ordenTrabajoId);
          for (const p of elegibles) { p.ordenTrabajoId = data.ordenTrabajoId; asociadas.push(p.id); }
          return { count: elegibles.length };
        }),
      },
      ordenDeTrabajo: {
        create: vi.fn(async ({ data }: { data: { estado: string; siniestroId: string } }) => {
          orden = { id: `OT-${++siguienteId}`, ...data }; return { id: orden.id };
        }),
        findUniqueOrThrow: vi.fn(async () => ({
          id: orden!.id, estado: orden!.estado, siniestro: { id: siniestroId, numeroSiniestro: "S1" },
          presupuestos: presupuestos.filter((p) => p.ordenTrabajoId === orden!.id).map((p) => ({
            id: p.id, numeroPresupuesto: p.id, estado: p.estado,
            reparaciones: [{ id: `detalle-${p.id}`, reparacion: { id: "reparacion-compartida", nombre: "Pintar puerta", sector: { id: "pintura", nombre: "Pintura" } } }],
          })),
          sectores: sectores.map((s) => ({ observacion: s.observacion, sector: { id: s.sectorId, nombre: "Pintura" } })),
        })),
      },
      ordenTrabajoSector: { createMany: vi.fn(async ({ data }: { data: typeof relaciones }) => {
        if (fallaSectores) throw new Error("No se pudieron guardar los sectores.");
        sectores = data; return { count: data.length };
      }) },
    };
    try {
      const resultado = await operacion(cliente);
      if (orden) ordenes.push(orden);
      relaciones.push(...sectores); return resultado;
    } catch (error: unknown) {
      for (const p of presupuestos) if (asociadas.includes(p.id) && p.ordenTrabajoId === orden?.id) p.ordenTrabajoId = null;
      throw error;
    }
  });
});

describe("crearOrdenTrabajo con persistencia simulada", () => {
  it.each([["P1"], ["P1", "P2"]])("crea BORRADOR con %j y sector único sin observación", async (...ids) => {
    expect((await crearOrdenTrabajo({ siniestroId, presupuestoIds: ids })).creada).toBe(true);
    expect(ordenes).toEqual([{ id: "OT-1", estado: "BORRADOR", siniestroId }]);
    expect(relaciones).toEqual([{ ordenTrabajoId: "OT-1", sectorId: "pintura", observacion: null }]);
    expect(presupuestos.filter((p) => p.ordenTrabajoId === "OT-1").map((p) => p.id)).toEqual(ids);
    expect(asociaciones[0]?.where).toEqual({ id: { in: ids }, estado: "APROBADO", siniestroId, ordenTrabajoId: null });
  });
  it.each([
    ["SINIESTRO_NO_ENCONTRADO", () => { existeSiniestro = false; }],
    ["PRESUPUESTO_NO_ENCONTRADO", () => { presupuestos = []; }],
    ["PRESUPUESTO_NO_APROBADO", () => { presupuestos[0]!.estado = "ENVIADO"; }],
    ["PRESUPUESTO_OTRO_SINIESTRO", () => { presupuestos[0]!.siniestroId = "otro"; }],
    ["PRESUPUESTO_YA_ASOCIADO", () => { presupuestos[0]!.ordenTrabajoId = "otra-OT"; }],
  ] as const)("rechaza %s sin crear órdenes", async (motivo, preparar) => {
    preparar(); expect(await crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1"] })).toEqual({ creada: false, motivo });
    expect(ordenes).toEqual([]); expect(relaciones).toEqual([]); expect(asociaciones).toEqual([]);
  });
  it("dos creaciones que leen el mismo presupuesto libre sólo confirman una OT", async () => {
    const resultados = await Promise.all([crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1"] }), crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1"] })]);
    expect(resultados.filter((r) => r.creada)).toHaveLength(1);
    expect(resultados.find((r) => !r.creada)).toEqual({ creada: false, motivo: "PRESUPUESTO_YA_ASOCIADO" });
    expect(ordenes).toHaveLength(1); expect(presupuestos[0]!.ordenTrabajoId).toBe(ordenes[0]!.id); expect(relaciones).toHaveLength(1);
    expect(asociaciones).toHaveLength(2);
  });
  it("revierte OT y asociación parcial si otro proceso ocupa un presupuesto", async () => {
    antesAsociar = () => { presupuestos[1]!.ordenTrabajoId = "OT-externa"; };
    expect(await crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1", "P2"] })).toEqual({ creada: false, motivo: "PRESUPUESTO_YA_ASOCIADO" });
    expect(ordenes).toEqual([]); expect(relaciones).toEqual([]); expect(presupuestos.map((p) => p.ordenTrabajoId)).toEqual([null, "OT-externa"]);
  });
  it("revierte asociaciones si falla la escritura de sectores", async () => {
    fallaSectores = true;
    await expect(crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1", "P2"] })).rejects.toThrow(/sectores/);
    expect(ordenes).toEqual([]); expect(relaciones).toEqual([]); expect(presupuestos.every((p) => p.ordenTrabajoId === null)).toBe(true);
  });
  it("deriva tareas independientes con procedencia aunque repitan reparación", async () => {
    const resultado = await crearOrdenTrabajo({ siniestroId, presupuestoIds: ["P1", "P2"] });
    if (!resultado.creada) throw new Error("Creación fallida.");
    expect(serializarDetalleOrdenTrabajo(resultado.ordenTrabajo).sectores[0]?.reparaciones.map((t) => [t.detalleReparacionId, t.presupuestoId, t.reparacion.id])).toEqual([
      ["detalle-P1", "P1", "reparacion-compartida"], ["detalle-P2", "P2", "reparacion-compartida"],
    ]);
  });
});
