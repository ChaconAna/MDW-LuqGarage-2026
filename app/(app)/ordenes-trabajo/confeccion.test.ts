import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({ auth: vi.fn(), usuario: vi.fn(), agregar: vi.fn(), observar: vi.fn(), finalizar: vi.fn(), revalidar: vi.fn() }));
vi.mock("@/auth", () => ({ auth: d.auth }));
vi.mock("@/lib/db/usuario", () => ({ obtenerUsuarioParaAutorizacionPorId: d.usuario }));
vi.mock("@/lib/auth", async () => import("../../../lib/auth"));
vi.mock("@/lib/db/ordenTrabajo", () => ({ crearOrdenTrabajo: vi.fn(), agregarPresupuestosOrdenTrabajoPorId: d.agregar, actualizarObservacionesOrdenTrabajoPorId: d.observar, finalizarOrdenTrabajoPorId: d.finalizar }));
vi.mock("@/lib/db/presupuesto", () => ({ listarPresupuestosAprobadosDisponibles: vi.fn() }));
vi.mock("@/lib/schemas/ordenTrabajo", async () => import("../../../lib/schemas/ordenTrabajo"));
vi.mock("@/lib/services/ordenTrabajo", async () => import("../../../lib/services/ordenTrabajo"));
vi.mock("next/cache", () => ({ revalidatePath: d.revalidar }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { incorporarPresupuestosOrdenTrabajoAction, guardarObservacionesOrdenTrabajoAction, finalizarOrdenTrabajoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const p1 = "20000000-0000-4000-8000-000000000001";
const p2 = "20000000-0000-4000-8000-000000000002";
const sectorId = "30000000-0000-4000-8000-000000000001";
const orden = { id, estado: "BORRADOR", siniestro: { id: p2, numeroSiniestro: "S1" }, presupuestos: [{ id: p1, numeroPresupuesto: "P1", estado: "APROBADO", reparaciones: [] }], sectores: [{ observacion: "guardada", sector: { id: sectorId, nombre: "Pintura" } }] };
const agregar = (ot: unknown = id, entrada: unknown = { presupuestoIds: [p1] }) => incorporarPresupuestosOrdenTrabajoAction(ot, entrada);
const observar = (ot: unknown = id, entrada: unknown = { sectores: [{ sectorId, observacion: "nota" }] }) => guardarObservacionesOrdenTrabajoAction(ot, entrada);
const finalizar = (ot: unknown = id) => finalizarOrdenTrabajoAction(ot);
const casos = [
  { nombre: "incorporación", ejecutar: agregar, persistir: d.agregar, indicador: "actualizada", motivos: ["ORDEN_TRABAJO_NO_ENCONTRADA", "ORDEN_TRABAJO_NO_EDITABLE", "PRESUPUESTO_NO_ENCONTRADO", "PRESUPUESTO_NO_APROBADO", "PRESUPUESTO_OTRO_SINIESTRO", "PRESUPUESTO_YA_PERTENECE", "PRESUPUESTO_YA_ASOCIADO"] },
  { nombre: "observaciones", ejecutar: observar, persistir: d.observar, indicador: "actualizada", motivos: ["ORDEN_TRABAJO_NO_ENCONTRADA", "ORDEN_TRABAJO_NO_EDITABLE", "SECTOR_NO_ENCONTRADO", "SECTOR_NO_PERTENECE"] },
  { nombre: "finalización", ejecutar: finalizar, persistir: d.finalizar, indicador: "finalizada", motivos: ["ORDEN_TRABAJO_NO_ENCONTRADA", "ORDEN_TRABAJO_NO_EDITABLE", "ORDEN_TRABAJO_SIN_PRESUPUESTOS", "PRESUPUESTO_NO_APROBADO", "REPARACIONES_SIN_SECTORIZAR"] },
] as const;

beforeEach(() => {
  vi.resetAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
  d.auth.mockResolvedValue({ user: { usuarioId: "usuario", rol: "ENCARGADO_DEL_TALLER" } });
  d.usuario.mockResolvedValue({ id: "usuario", activo: true, rol: "ENCARGADO_DEL_TALLER" });
  for (const caso of casos) caso.persistir.mockResolvedValue({ [caso.indicador]: true, ordenTrabajo: { ...orden, estado: caso.nombre === "finalización" ? "FINALIZADA" : "BORRADOR" } });
});
afterEach(() => vi.restoreAllMocks());

describe.each(casos)("Action de $nombre", (caso) => {
  it("autoriza en el servidor, ejecuta sólo su operación y devuelve detalle confirmado", async () => {
    const resultado = await caso.ejecutar();
    expect(resultado.mensajeExito).toBeTruthy(); expect(resultado.errorGeneral).toBeUndefined();
    expect(resultado.ordenTrabajo).toMatchObject({ id, estado: caso.nombre === "finalización" ? "FINALIZADA" : "BORRADOR" });
    expect(d.usuario.mock.invocationCallOrder[0]).toBeLessThan(caso.persistir.mock.invocationCallOrder[0]!);
    expect(caso.persistir).toHaveBeenCalledOnce();
    for (const otro of casos) if (otro !== caso) expect(otro.persistir).not.toHaveBeenCalled();
    expect(d.revalidar).toHaveBeenCalledWith(`/ordenes-trabajo/${id}`);
    expect(d.revalidar).toHaveBeenCalledWith("/ordenes-trabajo");
    expect(d.revalidar).toHaveBeenCalledWith(`/siniestros/${p2}`);
    expect(caso.persistir.mock.invocationCallOrder[0]).toBeLessThan(d.revalidar.mock.invocationCallOrder[0]!);
  });
  it.each(["RECEPCIONISTA", "MECANICO", "ADMINISTRADOR"])("rechaza %s aunque la sesión conserve el rol anterior", async (rol) => {
    d.usuario.mockResolvedValue({ id: "usuario", activo: true, rol });
    expect((await caso.ejecutar()).errorGeneral).toMatch(/permisos/); expect(caso.persistir).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
  });
  it.each(["ausente", "inactivo", "eliminado"])("rechaza usuario %s", async (estado) => {
    if (estado === "ausente") d.auth.mockResolvedValue(null);
    else d.usuario.mockResolvedValue(estado === "eliminado" ? null : { id: "usuario", activo: false, rol: "ENCARGADO_DEL_TALLER" });
    expect((await caso.ejecutar()).errorGeneral).toMatch(/sesión/); expect(caso.persistir).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
  });
  it.each(["inválido", null, { id }])("valida UUID %j antes de persistir", async (entrada) => {
    expect((await caso.ejecutar(entrada)).errorGeneral).toMatch(/no es válida/); expect(caso.persistir).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
  });
  it.each(caso.motivos)("traduce rechazo %s sin revalidar ni devolver éxito", async (motivo) => {
    caso.persistir.mockResolvedValue({ [caso.indicador]: false, motivo });
    const resultado = await caso.ejecutar();
    expect(resultado.errorGeneral).toBeTruthy(); expect(resultado.mensajeExito).toBeUndefined(); expect(resultado.ordenTrabajo).toBeUndefined(); expect(d.revalidar).not.toHaveBeenCalled();
  });
  it("maneja excepción inesperada sin detalles ni reintentos", async () => {
    caso.persistir.mockRejectedValue(new Error("dato técnico secreto"));
    const resultado = await caso.ejecutar(); expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
    expect(resultado.errorGeneral).not.toMatch(/secreto|técnico/); expect(resultado.ordenTrabajo).toBeUndefined(); expect(caso.persistir).toHaveBeenCalledOnce(); expect(d.revalidar).not.toHaveBeenCalled();
  });
});

it.each([[p1], [p1, p2]])("incorpora %j con contrato aditivo", async (...ids) => {
  await agregar(id, { presupuestoIds: ids });
  expect(d.agregar).toHaveBeenCalledExactlyOnceWith(id, { presupuestoIds: ids });
  for (const presupuestoId of ids) expect(d.revalidar).toHaveBeenCalledWith(`/presupuestos/${presupuestoId}`);
  expect(d.revalidar).toHaveBeenCalledWith(`/siniestros/${p2}/ordenes-trabajo/nueva`);
});
it.each([[], [p1, p1], ["inválido"]])("rechaza selección %j sin escribir", async (...ids) => {
  const resultado = await agregar(id, { presupuestoIds: ids }); expect(resultado.errorSeleccion).toBeTruthy(); expect(d.agregar).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
});
it.each(["texto", null])("guarda únicamente el sector solicitado con valor %j", async (observacion) => {
  const datos = { sectores: [{ sectorId, observacion }] }; await observar(id, datos); expect(d.observar).toHaveBeenCalledExactlyOnceWith(id, datos);
});
it.each([
  { sectores: [] }, { sectores: [{ sectorId: "inválido", observacion: "texto" }] },
  { sectores: [{ sectorId, observacion: "uno" }, { sectorId, observacion: "dos" }] },
  { sectores: [{ sectorId, observacion: 123 }] },
])("rechaza observaciones inválidas %j", async (datos) => {
  const resultado = await observar(id, datos); expect(resultado.errorObservaciones).toBeTruthy(); expect(d.observar).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
});
