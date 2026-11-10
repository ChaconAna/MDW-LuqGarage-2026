import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoOrdenTrabajo, EstadoPresupuesto } from "@prisma/client";

const d = vi.hoisted(() => ({ transaccion: vi.fn(), orden: vi.fn(), presupuestos: vi.fn() }));
vi.mock("./client", () => ({ prisma: { ordenDeTrabajo: { findUnique: d.orden }, presupuesto: { findMany: d.presupuestos } } }));
vi.mock("./transaccion", () => ({ ejecutarTransaccion: d.transaccion }));
import { agregarPresupuestosOrdenTrabajoPorId, actualizarObservacionesOrdenTrabajoPorId, finalizarOrdenTrabajoPorId } from "./ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "../services/ordenTrabajo";

type Presupuesto = { id: string; estado: EstadoPresupuesto; siniestroId: string; ordenTrabajoId: string | null; reparaciones: { id: string; reparacion: { id: string; nombre: string; sectorId: string; sector: { id: string; nombre: string } } }[] };
type Estado = { orden: { id: string; estado: EstadoOrdenTrabajo; siniestroId: string } | null; presupuestos: Presupuesto[]; sectores: { sectorId: string; observacion: string | null }[] };
let estado: Estado;
let cola: Promise<void>;
let fallaSector: boolean;
let fallaSegundaObservacion: boolean;
let conflictoAsociacion: boolean;
let escrituras: string[];
let notificarBloqueo: (() => void) | undefined;
const catalogoSectores = ["S1", "S2", "AJENO"];
function presupuesto(id: string, sectorId: string, ordenTrabajoId: string | null = null): Presupuesto {
  return { id, estado: "APROBADO", siniestroId: "SIN", ordenTrabajoId,
    reparaciones: [{ id: `detalle-${id}`, reparacion: { id: "rep-compartida", nombre: "Reparación", sectorId, sector: { id: sectorId, nombre: sectorId } } }] };
}
function detalle(datos: Estado) {
  return { ...datos.orden!, siniestro: { id: "SIN", numeroSiniestro: "SIN-1" },
    presupuestos: datos.presupuestos.filter((p) => p.ordenTrabajoId === "OT").map((p) => ({ ...p, numeroPresupuesto: p.id })),
    sectores: datos.sectores.map((s) => ({ ...s, sector: { id: s.sectorId, nombre: s.sectorId } })),
  };
}

beforeEach(() => {
  vi.resetAllMocks(); cola = Promise.resolve(); fallaSector = false; fallaSegundaObservacion = false; conflictoAsociacion = false; escrituras = []; notificarBloqueo = undefined;
  estado = { orden: { id: "OT", estado: "BORRADOR", siniestroId: "SIN" }, presupuestos: [presupuesto("P1", "S1", "OT"), presupuesto("P2", "S1"), presupuesto("P3", "S2")], sectores: [{ sectorId: "S1", observacion: "Conservar" }] };
  d.orden.mockImplementation(async () => structuredClone(estado.orden));
  d.presupuestos.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => structuredClone(estado.presupuestos.filter((p) => where.id.in.includes(p.id))));
  // Doble de Prisma con bloqueo por fila de OT, lectura previa y commit/rollback.
  // Ejercita las funciones reales; no reemplaza una prueba de aislamiento PostgreSQL.
  d.transaccion.mockImplementation(async (operacion) => {
    let local: Estado | undefined;
    let liberar: (() => void) | undefined;
    let observacionesActualizadas = 0;
    async function bloquear() {
      if (local) return;
      const anterior = cola;
      cola = new Promise<void>((resolve) => { liberar = resolve; });
      await anterior;
      local = structuredClone(estado);
      notificarBloqueo?.();
    }
    const actual = () => local ?? estado;
    const cliente = {
      ordenDeTrabajo: {
        findUnique: vi.fn(async () => structuredClone(actual().orden)),
        updateMany: vi.fn(async ({ where, data }: { where: { id: string; estado: EstadoOrdenTrabajo }; data: { estado: EstadoOrdenTrabajo } }) => {
          await bloquear();
          if (local!.orden?.id !== where.id || local!.orden.estado !== where.estado) return { count: 0 };
          local!.orden.estado = data.estado; escrituras.push(`estado:${data.estado}`); return { count: 1 };
        }),
        findUniqueOrThrow: vi.fn(async () => detalle(actual())),
      },
      presupuesto: {
        findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => structuredClone(actual().presupuestos.filter((p) => where.id.in.includes(p.id)))),
        updateMany: vi.fn(async ({ where, data }: { where: { id: { in: string[] }; estado: EstadoPresupuesto; siniestroId: string; ordenTrabajoId: null }; data: { ordenTrabajoId: string } }) => {
          if (conflictoAsociacion) {
            const ultimo = where.id.in.at(-1)!;
            estado.presupuestos.find((p) => p.id === ultimo)!.ordenTrabajoId = "OT-externa";
            local!.presupuestos.find((p) => p.id === ultimo)!.ordenTrabajoId = "OT-externa";
          }
          const elegibles = actual().presupuestos.filter((p) => where.id.in.includes(p.id) && p.estado === where.estado && p.siniestroId === where.siniestroId && p.ordenTrabajoId === where.ordenTrabajoId);
          for (const p of elegibles) p.ordenTrabajoId = data.ordenTrabajoId;
          escrituras.push("asociar"); return { count: elegibles.length };
        }),
      },
      sector: { findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => catalogoSectores.filter((id) => where.id.in.includes(id)).map((id) => ({ id }))) },
      ordenTrabajoSector: {
        findMany: vi.fn(async ({ where }: { where: { ordenTrabajoId: string; sectorId: { in: string[] } } }) => actual().sectores.filter((s) => where.ordenTrabajoId === "OT" && where.sectorId.in.includes(s.sectorId))),
        createMany: vi.fn(async ({ data }: { data: { sectorId: string; observacion: null }[] }) => {
          if (fallaSector) throw new Error("Falla de sectores");
          for (const s of data) {
            if (actual().sectores.some((existente) => existente.sectorId === s.sectorId)) throw new Error("Sector duplicado");
            actual().sectores.push({ sectorId: s.sectorId, observacion: s.observacion });
          }
          escrituras.push("sectores"); return { count: data.length };
        }),
        update: vi.fn(async ({ where, data }: { where: { ordenTrabajoId_sectorId: { ordenTrabajoId: string; sectorId: string } }; data: { observacion: string | null } }) => {
          if (fallaSegundaObservacion && ++observacionesActualizadas === 2) throw new Error("Falla de observación");
          const relacion = actual().sectores.find((s) => s.sectorId === where.ordenTrabajoId_sectorId.sectorId && where.ordenTrabajoId_sectorId.ordenTrabajoId === "OT");
          if (!relacion) throw new Error("Relación inexistente");
          relacion.observacion = data.observacion; escrituras.push("observación"); return relacion;
        }),
      },
    };
    try {
      const resultado = await operacion(cliente);
      if (local) estado = local;
      return resultado;
    } finally { liberar?.(); }
  });
});

const agregar = (ids = ["P2"]) => agregarPresupuestosOrdenTrabajoPorId("OT", { presupuestoIds: ids });
const observar = (observacion: string | null = "Editada") => actualizarObservacionesOrdenTrabajoPorId("OT", { sectores: [{ sectorId: "S1", observacion }] });
const finalizar = () => finalizarOrdenTrabajoPorId("OT");

describe("incorporación transaccional", () => {
  it.each([["P2"], ["P2", "P3"]])("incorpora %j conservando presupuestos y observaciones", async (...ids) => {
    const resultado = await agregar(ids); expect(resultado.actualizada).toBe(true);
    expect(estado.presupuestos.filter((p) => p.ordenTrabajoId === "OT").map((p) => p.id)).toEqual(["P1", ...ids]);
    expect(estado.sectores[0]).toEqual({ sectorId: "S1", observacion: "Conservar" });
    if (ids.includes("P3")) expect(estado.sectores[1]).toEqual({ sectorId: "S2", observacion: null });
    if (!resultado.actualizada) throw new Error("Incorporación fallida");
    const tareas = serializarDetalleOrdenTrabajo(resultado.ordenTrabajo).sectores.flatMap((s) => s.reparaciones);
    expect(tareas).toHaveLength(1 + ids.length); expect(new Set(tareas.map((t) => t.detalleReparacionId)).size).toBe(1 + ids.length);
  });
  it.each([
    ["ORDEN_TRABAJO_NO_ENCONTRADA", () => { estado.orden = null; }],
    ["ORDEN_TRABAJO_NO_EDITABLE", () => { estado.orden!.estado = "FINALIZADA"; }],
    ["PRESUPUESTO_NO_ENCONTRADO", () => { estado.presupuestos = estado.presupuestos.filter((p) => p.id !== "P2"); }],
    ["PRESUPUESTO_NO_APROBADO", () => { estado.presupuestos[1]!.estado = "ENVIADO"; }],
    ["PRESUPUESTO_OTRO_SINIESTRO", () => { estado.presupuestos[1]!.siniestroId = "otro"; }],
    ["PRESUPUESTO_YA_PERTENECE", () => { estado.presupuestos[1]!.ordenTrabajoId = "OT"; }],
    ["PRESUPUESTO_YA_ASOCIADO", () => { estado.presupuestos[1]!.ordenTrabajoId = "otra"; }],
  ] as const)("rechaza %s antes de escribir", async (motivo, preparar) => {
    preparar(); const inicial = structuredClone(estado);
    expect(await agregar()).toEqual({ actualizada: false, motivo }); expect(estado).toEqual(inicial); expect(escrituras).toEqual([]);
  });
  it("revierte asociación parcial y sectores al perder un presupuesto concurrentemente", async () => {
    conflictoAsociacion = true;
    expect(await agregar(["P2", "P3"])).toEqual({ actualizada: false, motivo: "PRESUPUESTO_YA_ASOCIADO" });
    expect(estado.presupuestos.map((p) => p.ordenTrabajoId)).toEqual(["OT", null, "OT-externa"]);
    expect(estado.sectores).toEqual([{ sectorId: "S1", observacion: "Conservar" }]);
  });
  it("revierte asociaciones si falla la incorporación del sector", async () => {
    fallaSector = true; const inicial = structuredClone(estado);
    await expect(agregar(["P2", "P3"])).rejects.toThrow(/sectores/); expect(estado).toEqual(inicial);
  });
});

describe("observaciones y finalización transaccionales", () => {
  it.each(["Nueva", null])("actualización parcial %j conserva los demás sectores", async (valor) => {
    estado.sectores.push({ sectorId: "S2", observacion: "Intacta" });
    expect((await observar(valor)).actualizada).toBe(true);
    expect(estado.sectores).toEqual([{ sectorId: "S1", observacion: valor }, { sectorId: "S2", observacion: "Intacta" }]);
  });
  it.each([["inexistente", "SECTOR_NO_ENCONTRADO"], ["AJENO", "SECTOR_NO_PERTENECE"]])("rechaza sector %s", async (sectorId, motivo) => {
    const inicial = structuredClone(estado);
    expect(await actualizarObservacionesOrdenTrabajoPorId("OT", { sectores: [{ sectorId, observacion: "No guardar" }] })).toEqual({ actualizada: false, motivo });
    expect(estado).toEqual(inicial); expect(escrituras).toEqual([]);
  });
  it("revierte todas las observaciones si falla una actualización posterior", async () => {
    estado.sectores.push({ sectorId: "S2", observacion: "Segunda" }); fallaSegundaObservacion = true; const inicial = structuredClone(estado);
    await expect(actualizarObservacionesOrdenTrabajoPorId("OT", { sectores: [{ sectorId: "S1", observacion: "Uno" }, { sectorId: "S2", observacion: "Dos" }] })).rejects.toThrow(/observación/);
    expect(estado).toEqual(inicial);
  });
  it("finaliza conservando siniestro, presupuestos y observaciones", async () => {
    const inicial = structuredClone(estado); expect((await finalizar()).finalizada).toBe(true);
    expect(estado).toEqual({ ...inicial, orden: { ...inicial.orden, estado: "FINALIZADA" } });
  });
  it.each([
    ["ORDEN_TRABAJO_NO_ENCONTRADA", () => { estado.orden = null; }],
    ["ORDEN_TRABAJO_NO_EDITABLE", () => { estado.orden!.estado = "FINALIZADA"; }],
    ["ORDEN_TRABAJO_SIN_PRESUPUESTOS", () => { estado.presupuestos[0]!.ordenTrabajoId = null; }],
    ["PRESUPUESTO_NO_APROBADO", () => { estado.presupuestos[0]!.estado = "ENVIADO"; }],
    ["REPARACIONES_SIN_SECTORIZAR", () => { estado.sectores = []; }],
  ] as const)("no finaliza cuando %s", async (motivo, preparar) => {
    preparar(); const inicial = structuredClone(estado); expect(await finalizar()).toEqual({ finalizada: false, motivo }); expect(estado).toEqual(inicial);
  });
  it("rechaza todas las escrituras después de finalizar", async () => {
    await finalizar(); const inicial = structuredClone(estado);
    expect(await observar()).toEqual({ actualizada: false, motivo: "ORDEN_TRABAJO_NO_EDITABLE" });
    expect(await agregar()).toEqual({ actualizada: false, motivo: "ORDEN_TRABAJO_NO_EDITABLE" });
    expect(await finalizar()).toEqual({ finalizada: false, motivo: "ORDEN_TRABAJO_NO_EDITABLE" }); expect(estado).toEqual(inicial);
  });
});

describe("competencia por el bloqueo de BORRADOR", () => {
  it("dos incorporaciones del mismo presupuesto sólo lo asocian una vez", async () => {
    const resultados = await Promise.all([agregar(), agregar()]);
    expect(resultados.filter((r) => r.actualizada)).toHaveLength(1);
    expect(resultados.find((r) => !r.actualizada)).toEqual({ actualizada: false, motivo: "PRESUPUESTO_YA_PERTENECE" });
    expect(estado.presupuestos.filter((p) => p.ordenTrabajoId === "OT")).toHaveLength(2); expect(estado.sectores).toHaveLength(1);
  });
  it("incorporación y observaciones serializadas conservan ambas modificaciones", async () => {
    const resultados = await Promise.all([agregar(["P3"]), observar()]);
    expect(resultados.every((r) => r.actualizada)).toBe(true);
    expect(estado.sectores).toEqual([{ sectorId: "S1", observacion: "Editada" }, { sectorId: "S2", observacion: null }]);
  });
  it.each(["incorporación", "observaciones"])("finalización que gana bloquea %s con lectura inicial desactualizada", async (tipo) => {
    const [fin, cambio] = await Promise.all([finalizar(), tipo === "incorporación" ? agregar() : observar()]);
    expect(fin.finalizada).toBe(true); expect(cambio).toEqual({ actualizada: false, motivo: "ORDEN_TRABAJO_NO_EDITABLE" });
    expect(estado.presupuestos[1]!.ordenTrabajoId).toBeNull(); expect(estado.sectores[0]!.observacion).toBe("Conservar");
  });
  it.each(["incorporación", "observaciones"])("%s que gana se conserva al finalizar", async (tipo) => {
    const obtuvoBloqueo = new Promise<void>((resolve) => { notificarBloqueo = resolve; });
    const primera = tipo === "incorporación" ? agregar(["P3"]) : observar();
    await obtuvoBloqueo;
    const [cambio, fin] = await Promise.all([primera, finalizar()]);
    expect(cambio.actualizada).toBe(true); expect(fin.finalizada).toBe(true); expect(estado.orden!.estado).toBe("FINALIZADA");
    if (tipo === "incorporación") { expect(estado.presupuestos[2]!.ordenTrabajoId).toBe("OT"); expect(estado.sectores[1]!.sectorId).toBe("S2"); }
    else expect(estado.sectores[0]!.observacion).toBe("Editada");
  });
});
