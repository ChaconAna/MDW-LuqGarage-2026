import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({ auth: vi.fn(), usuario: vi.fn(), crear: vi.fn(), listar: vi.fn(), revalidar: vi.fn(), redirigir: vi.fn() }));
vi.mock("@/auth", () => ({ auth: d.auth }));
vi.mock("@/lib/db/usuario", () => ({ obtenerUsuarioParaAutorizacionPorId: d.usuario }));
vi.mock("@/lib/auth", async () => import("../../../lib/auth"));
vi.mock("@/lib/db/ordenTrabajo", () => ({ crearOrdenTrabajo: d.crear }));
vi.mock("@/lib/db/presupuesto", () => ({ listarPresupuestosAprobadosDisponibles: d.listar }));
vi.mock("@/lib/schemas/ordenTrabajo", async () => import("../../../lib/schemas/ordenTrabajo"));
vi.mock("@/lib/services/ordenTrabajo", async () => import("../../../lib/services/ordenTrabajo"));
vi.mock("next/cache", () => ({ revalidatePath: d.revalidar }));
vi.mock("next/navigation", () => ({ redirect: d.redirigir }));

import { crearOrdenTrabajoAction, consultarPresupuestosDisponiblesAction } from "./actions";

const siniestroId = "10000000-0000-4000-8000-000000000001";
const presupuestoId = "20000000-0000-4000-8000-000000000002";
const otroId = "20000000-0000-4000-8000-000000000003";
const ordenId = "30000000-0000-4000-8000-000000000001";
const redirect = new Error("NEXT_REDIRECT");
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  d.auth.mockResolvedValue({ user: { usuarioId: "usuario", rol: "ENCARGADO_DEL_TALLER" } });
  d.usuario.mockResolvedValue({ id: "usuario", activo: true, rol: "ENCARGADO_DEL_TALLER" });
  d.crear.mockResolvedValue({ creada: true, ordenTrabajo: { id: ordenId } });
  d.listar.mockResolvedValue({ presupuestos: [], total: 0 });
  d.redirigir.mockImplementation(() => { throw redirect; });
});
afterEach(() => vi.restoreAllMocks());

describe("creación de OT desde Action", () => {
  it.each([[presupuestoId], [presupuestoId, otroId]])("crea con %j y revalida antes de redirigir", async (...ids) => {
    await expect(crearOrdenTrabajoAction(siniestroId, {}, ids)).rejects.toBe(redirect);
    expect(d.crear).toHaveBeenCalledExactlyOnceWith({ siniestroId, presupuestoIds: ids });
    expect(d.usuario.mock.invocationCallOrder[0]).toBeLessThan(d.crear.mock.invocationCallOrder[0]!);
    expect(d.revalidar.mock.calls.map(([ruta]) => ruta)).toEqual([
      "/ordenes-trabajo", `/siniestros/${siniestroId}`, `/siniestros/${siniestroId}/ordenes-trabajo/nueva`, ...ids.map((id) => `/presupuestos/${id}`),
    ]);
    expect(d.crear.mock.invocationCallOrder[0]).toBeLessThan(d.revalidar.mock.invocationCallOrder[0]!);
    expect(d.revalidar.mock.invocationCallOrder.at(-1)).toBeLessThan(d.redirigir.mock.invocationCallOrder[0]!);
    expect(d.redirigir).toHaveBeenCalledWith(`/ordenes-trabajo/${ordenId}`);
  });

  it.each(["RECEPCIONISTA", "MECANICO", "ADMINISTRADOR"])("rechaza %s aunque JWT diga Encargado", async (rol) => {
    d.usuario.mockResolvedValue({ id: "usuario", activo: true, rol });
    expect((await crearOrdenTrabajoAction(siniestroId, {}, [presupuestoId])).errorGeneral).toMatch(/permisos/);
    expect(d.crear).not.toHaveBeenCalled();
    expect(d.revalidar).not.toHaveBeenCalled(); expect(d.redirigir).not.toHaveBeenCalled();
  });
  it.each(["sin sesión", "inactivo", "eliminado"])("rechaza usuario %s", async (caso) => {
    if (caso === "sin sesión") d.auth.mockResolvedValue(null);
    else d.usuario.mockResolvedValue(caso === "eliminado" ? null : { id: "usuario", activo: false, rol: "ENCARGADO_DEL_TALLER" });
    expect((await crearOrdenTrabajoAction(siniestroId, {}, [presupuestoId])).errorGeneral).toMatch(/sesión/);
    expect(d.crear).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled();
  });
  it.each([
    { sin: "inválido", ids: [presupuestoId] }, { sin: siniestroId, ids: [] },
    { sin: siniestroId, ids: [presupuestoId, presupuestoId] }, { sin: siniestroId, ids: ["inválido"] },
  ])("valida entrada $sin / $ids", async ({ sin, ids }) => {
    const resultado = await crearOrdenTrabajoAction(sin, {}, ids);
    expect(resultado.errorGeneral).toBeTruthy();
    if (sin === siniestroId) expect(resultado.errorSeleccion).toBeTruthy();
    expect(d.crear).not.toHaveBeenCalled(); expect(d.revalidar).not.toHaveBeenCalled(); expect(d.redirigir).not.toHaveBeenCalled();
  });
  it.each([
    ["SINIESTRO_NO_ENCONTRADO", /siniestro ya no existe/],
    ["PRESUPUESTO_NO_ENCONTRADO", /ya no existen/], ["PRESUPUESTO_NO_APROBADO", /APROBADOS/],
    ["PRESUPUESTO_OTRO_SINIESTRO", /este siniestro/], ["PRESUPUESTO_YA_ASOCIADO", /ya asoció/],
  ])("traduce %s sin anunciar éxito", async (motivo, mensaje) => {
    d.crear.mockResolvedValue({ creada: false, motivo });
    expect((await crearOrdenTrabajoAction(siniestroId, {}, [presupuestoId])).errorGeneral).toMatch(mensaje);
    expect(d.revalidar).not.toHaveBeenCalled(); expect(d.redirigir).not.toHaveBeenCalled();
  });
  it("no expone excepciones ni reintenta", async () => {
    d.crear.mockRejectedValue(new Error("detalle técnico"));
    const resultado = await crearOrdenTrabajoAction(siniestroId, {}, [presupuestoId]);
    expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
    expect(resultado.errorGeneral).not.toContain("técnico"); expect(d.crear).toHaveBeenCalledOnce();
    expect(d.revalidar).not.toHaveBeenCalled(); expect(d.redirigir).not.toHaveBeenCalled();
  });
});

describe("catálogo paginado protegido", () => {
  it("permite recorrer once presupuestos sin repetir ni omitir", async () => {
    const todos = Array.from({ length: 11 }, (_, indice) => ({ id: String(indice), numeroPresupuesto: `P${indice}` }));
    d.listar.mockImplementation(async (_sin, page, limit) => ({ presupuestos: todos.slice((page - 1) * limit, page * limit), total: todos.length }));
    const primera = await consultarPresupuestosDisponiblesAction(siniestroId, 1);
    const segunda = await consultarPresupuestosDisponiblesAction(siniestroId, 2);
    expect(primera.ok && segunda.ok).toBe(true);
    if (!primera.ok || !segunda.ok) throw new Error("Catálogo no disponible.");
    expect([...primera.presupuestos, ...segunda.presupuestos]).toEqual(todos);
    expect(d.usuario.mock.invocationCallOrder[0]).toBeLessThan(d.listar.mock.invocationCallOrder[0]!);
  });
  it.each([0, -1, 1.5, "abc", ["2", "3"], Number.MAX_SAFE_INTEGER, Number.MAX_VALUE])("rechaza página %j sin consultar", async (page) => {
    expect((await consultarPresupuestosDisponiblesAction(siniestroId, page)).ok).toBe(false);
    expect(d.listar).not.toHaveBeenCalled();
  });
  it("ajusta una página fuera de rango", async () => {
    d.listar.mockResolvedValueOnce({ presupuestos: [], total: 11 }).mockResolvedValueOnce({ presupuestos: [{ id: presupuestoId }], total: 11 });
    expect(await consultarPresupuestosDisponiblesAction(siniestroId, 3)).toMatchObject({ ok: true, pagina: 2 });
    expect(d.listar.mock.calls).toEqual([[siniestroId, 3, 10], [siniestroId, 2, 10]]);
  });
  it.each(["RECEPCIONISTA", "MECANICO", "ADMINISTRADOR"])("no lee catálogo como %s", async (rol) => {
    d.usuario.mockResolvedValue({ id: "usuario", activo: true, rol });
    expect(await consultarPresupuestosDisponiblesAction(siniestroId, 1)).toMatchObject({ ok: false, error: expect.stringMatching(/permisos/) });
    expect(d.listar).not.toHaveBeenCalled();
  });
  it("no lee con UUID inválido", async () => {
    expect((await consultarPresupuestosDisponiblesAction("inválido", 1)).ok).toBe(false); expect(d.listar).not.toHaveBeenCalled();
  });
  it("informa falla de catálogo sin mencionar guardado", async () => {
    d.listar.mockRejectedValue(new Error("lectura"));
    expect(await consultarPresupuestosDisponiblesAction(siniestroId, 1)).toEqual({ ok: false, error: "No pudimos cargar los presupuestos. Intentá nuevamente." });
    expect(d.revalidar).not.toHaveBeenCalled(); expect(d.redirigir).not.toHaveBeenCalled();
  });
});
