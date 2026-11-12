import { beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {}, ErrorAutorizacion: class extends Error {},
  requerirRol: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), reparaciones: vi.fn(), repuestos: vi.fn(),
  revalidatePath: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ ErrorAutenticacion: d.ErrorAutenticacion, ErrorAutorizacion: d.ErrorAutorizacion, requerirRol: d.requerirRol }));
vi.mock("@/lib/db/presupuesto", () => ({ crearPresupuesto: d.crear, actualizarPresupuestoPorId: d.actualizar }));
vi.mock("@/lib/db/reparacion", () => ({ listarReparaciones: d.reparaciones }));
vi.mock("@/lib/db/repuesto", () => ({ listarRepuestos: d.repuestos }));
vi.mock("next/cache", () => ({ revalidatePath: d.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: d.redirect }));
vi.mock("@/lib/schemas/presupuesto", async () => import("../../../lib/schemas/presupuesto"));
vi.mock("@/lib/schemas/catalogoPresupuesto", async () => import("../../../lib/schemas/catalogoPresupuesto"));
vi.mock("@/lib/services/presupuestoFormulario", async () => import("../../../lib/services/presupuestoFormulario"));

import { crearPresupuestoAction, actualizarPresupuestoAction, consultarCatalogoPresupuestoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const siniestroId = "20000000-0000-4000-8000-000000000002";
const reparacionId = "30000000-0000-4000-8000-000000000003";
const repuestoId = "40000000-0000-4000-8000-000000000004";
const anterior = { errores: {} };
const colecciones = () => ({ reparaciones: [{ reparacionId, costo: "0.00" }], repuestos: [{ repuestoId, cantidad: 1 }] });
const alta = () => ({ ...colecciones(), numeroPresupuesto: "P-1" });
const redireccion = new Error("REDIRECCION_SIMULADA");

beforeEach(() => {
  vi.resetAllMocks();
  d.requerirRol.mockResolvedValue({ id: "usuario", rol: "ENCARGADO_DEL_TALLER" });
  const presupuesto = { id, siniestro: { id: siniestroId } };
  d.crear.mockResolvedValue({ creado: true, presupuesto });
  d.actualizar.mockResolvedValue({ actualizado: true, presupuesto });
  d.reparaciones.mockResolvedValue({ opciones: [{ id: reparacionId, nombre: "Reparación" }], total: 11 });
  d.repuestos.mockResolvedValue({ opciones: [], total: 0 });
  d.redirect.mockImplementation(() => { throw redireccion; });
});

function sinExito() {
  expect(d.redirect).not.toHaveBeenCalled();
  expect(d.revalidatePath).not.toHaveBeenCalled();
}

describe("Actions de presupuestos", () => {
  it("crea con los schemas reales, costo cero y revalida antes de redirigir", async () => {
    const datos = alta();
    await expect(crearPresupuestoAction(siniestroId, anterior, datos)).rejects.toBe(redireccion);
    expect(d.requerirRol).toHaveBeenCalledWith(["ENCARGADO_DEL_TALLER"]);
    expect(d.crear).toHaveBeenCalledWith({ ...datos, siniestroId });
    expect(d.requerirRol.mock.invocationCallOrder[0]).toBeLessThan(d.crear.mock.invocationCallOrder[0]!);
    expect(d.revalidatePath.mock.calls).toEqual([["/siniestros"], [`/siniestros/${siniestroId}`]]);
    expect(d.revalidatePath.mock.invocationCallOrder.at(-1)).toBeLessThan(d.redirect.mock.invocationCallOrder[0]!);
    expect(d.redirect).toHaveBeenCalledWith(`/presupuestos/${id}`);
  });
  it("admite repuestos omitidos sin exigirlos", async () => {
    const datos = { numeroPresupuesto: "P-1", reparaciones: colecciones().reparaciones };
    await expect(crearPresupuestoAction(siniestroId, anterior, datos)).rejects.toBe(redireccion);
    expect(d.crear).toHaveBeenCalledWith({ ...datos, siniestroId, repuestos: [] });
  });
  it("usa el ID asociado desde la página aunque el cliente envíe otro", async () => {
    const otroSiniestroId = "20000000-0000-4000-8000-000000000099";
    await expect(crearPresupuestoAction(siniestroId, anterior, { ...alta(), siniestroId: otroSiniestroId })).rejects.toBe(redireccion);
    expect(d.crear).toHaveBeenCalledWith({ ...alta(), siniestroId });
    expect(d.revalidatePath).toHaveBeenCalledWith(`/siniestros/${siniestroId}`);
  });
  it.each(["crear", "editar", "catalogo"])("autoriza antes de cualquier operación de %s", async (operacion) => {
    d.requerirRol.mockRejectedValue(new d.ErrorAutorizacion());
    const resultado = operacion === "crear" ? await crearPresupuestoAction(siniestroId, anterior, alta())
      : operacion === "editar" ? await actualizarPresupuestoAction(id, anterior, colecciones())
      : await consultarCatalogoPresupuestoAction({ tipo: "reparaciones", page: 1, limit: 10 });
    expect(JSON.stringify(resultado)).toMatch(/permisos/);
    expect(d.crear).not.toHaveBeenCalled(); expect(d.actualizar).not.toHaveBeenCalled();
    expect(d.reparaciones).not.toHaveBeenCalled(); expect(d.repuestos).not.toHaveBeenCalled();
    sinExito();
  });
  it("informa la sesión ausente", async () => {
    d.requerirRol.mockRejectedValue(new d.ErrorAutenticacion());
    expect((await crearPresupuestoAction(siniestroId, anterior, alta())).errorGeneral).toMatch(/sesión/);
    expect(d.crear).not.toHaveBeenCalled(); sinExito();
  });
  it.each([
    ["número vacío", { numeroPresupuesto: "" }, "numeroPresupuesto"],
    ["sin reparaciones", { reparaciones: [] }, "reparaciones"],
    ["costo negativo", { reparaciones: [{ reparacionId, costo: "-0.01" }] }, "reparaciones.0.costo"],
    ["costo sin decimales", { reparaciones: [{ reparacionId, costo: "1" }] }, "reparaciones.0.costo"],
    ["costo numérico", { reparaciones: [{ reparacionId, costo: 1 }] }, "reparaciones.0.costo"],
    ["costo con coma", { reparaciones: [{ reparacionId, costo: "1,00" }] }, "reparaciones.0.costo"],
    ["cantidad cero", { repuestos: [{ repuestoId, cantidad: 0 }] }, "repuestos.0.cantidad"],
    ["cantidad fraccionaria", { repuestos: [{ repuestoId, cantidad: 1.5 }] }, "repuestos.0.cantidad"],
    ["reparación repetida", { reparaciones: [{ reparacionId, costo: "1.00" }, { reparacionId, costo: "2.00" }] }, "reparaciones.1.reparacionId"],
    ["repuesto repetido", { repuestos: [{ repuestoId, cantidad: 1 }, { repuestoId, cantidad: 2 }] }, "repuestos.1.repuestoId"],
  ] as const)("rechaza %s y devuelve el error en su campo o fila", async (_caso, cambio, campo) => {
    const resultado = await crearPresupuestoAction(siniestroId, anterior, { ...alta(), ...cambio });
    expect(resultado.errores[campo]).toBeTruthy(); expect(resultado.errorGeneral).toBeTruthy();
    expect(d.crear).not.toHaveBeenCalled(); sinExito();
  });
  it("valida el UUID asociado antes de persistir", async () => {
    const resultado = await crearPresupuestoAction("inválido", anterior, alta());
    expect(resultado.errores.siniestroId).toBeTruthy();
    expect(d.crear).not.toHaveBeenCalled(); sinExito();
  });
  it.each(["NUMERO_DUPLICADO", "SINIESTRO_NO_ENCONTRADO", "REPARACION_NO_ENCONTRADA", "REPUESTO_NO_ENCONTRADO"])("muestra el rechazo de alta %s arriba del formulario", async (motivo) => {
    d.crear.mockResolvedValue({ creado: false, motivo });
    const resultado = await crearPresupuestoAction(siniestroId, anterior, alta());
    expect(resultado.errorGeneral).toMatch(/existe|existen/);
    if (motivo === "NUMERO_DUPLICADO") expect(resultado.errores.numeroPresupuesto).toMatch(/Ya existe/);
    sinExito();
  });
  it("actualiza solamente colecciones y revalida las vistas afectadas", async () => {
    const datos = { reparaciones: colecciones().reparaciones, repuestos: [] };
    await expect(actualizarPresupuestoAction(id, anterior, datos)).rejects.toBe(redireccion);
    expect(d.requerirRol).toHaveBeenCalledWith(["ENCARGADO_DEL_TALLER"]);
    expect(d.actualizar).toHaveBeenCalledWith(id, datos);
    expect(d.requerirRol.mock.invocationCallOrder[0]).toBeLessThan(d.actualizar.mock.invocationCallOrder[0]!);
    expect(d.revalidatePath.mock.calls).toEqual([[`/siniestros/${siniestroId}`], [`/presupuestos/${id}`], [`/presupuestos/${id}/editar`]]);
    expect(d.redirect).toHaveBeenCalledWith(`/presupuestos/${id}`);
  });
  it.each(["numeroPresupuesto", "siniestroId", "estado", "ordenTrabajoId", "total"])("rechaza el campo inmutable o ajeno %s", async (campo) => {
    const resultado = await actualizarPresupuestoAction(id, anterior, { ...colecciones(), [campo]: "alterado" });
    expect(resultado.errorGeneral).toBeTruthy(); expect(d.actualizar).not.toHaveBeenCalled(); sinExito();
  });
  it("valida el UUID de edición", async () => {
    expect((await actualizarPresupuestoAction("inválido", anterior, colecciones())).errorGeneral).toMatch(/válido/);
    expect(d.actualizar).not.toHaveBeenCalled(); sinExito();
  });
  it.each(["PRESUPUESTO_NO_ENCONTRADO", "PRESUPUESTO_NO_EDITABLE", "REPARACION_NO_ENCONTRADA", "REPUESTO_NO_ENCONTRADO"])("informa el rechazo de edición %s sin redirigir", async (motivo) => {
    d.actualizar.mockResolvedValue({ actualizado: false, motivo });
    const resultado = await actualizarPresupuestoAction(id, anterior, colecciones());
    expect(resultado.errorGeneral).toMatch(/existe|existen|BORRADOR/); sinExito();
  });
  it("no expone errores técnicos ni reintenta", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    d.crear.mockRejectedValue(new Error("secreto-simulado"));
    const resultado = await crearPresupuestoAction(siniestroId, anterior, alta());
    expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
    expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
    expect(d.crear).toHaveBeenCalledTimes(1); sinExito(); log.mockRestore();
  });
});

describe("lectura de catálogos", () => {
  it.each(["reparaciones", "repuestos"])("informa una falla de carga de %s sin mencionar un guardado", async (tipo) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      (tipo === "reparaciones" ? d.reparaciones : d.repuestos).mockRejectedValue(new Error("detalle-tecnico-simulado"));
      const resultado = await consultarCatalogoPresupuestoAction({ tipo, page: 1, limit: 10 });
      expect(resultado).toEqual({ ok: false, error: "No pudimos cargar el catálogo. Intentá nuevamente." });
      expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("detalle-tecnico-simulado");
      expect(d.crear).not.toHaveBeenCalled(); expect(d.actualizar).not.toHaveBeenCalled(); sinExito();
    } finally {
      log.mockRestore();
    }
  });
  it.each([
    [new d.ErrorAutenticacion(), "Tu sesión no está disponible. Volvé a iniciar sesión."],
    [new d.ErrorAutorizacion(), "No tenés permisos para gestionar presupuestos."],
  ])("mantiene el mensaje de acceso al consultar: %s", async (error, mensaje) => {
    d.requerirRol.mockRejectedValue(error);
    expect(await consultarCatalogoPresupuestoAction({ tipo: "reparaciones", page: 1, limit: 10 })).toEqual({ ok: false, error: mensaje });
    expect(d.reparaciones).not.toHaveBeenCalled(); expect(d.repuestos).not.toHaveBeenCalled(); sinExito();
  });
  it.each(["reparaciones", "repuestos"])("pagina %s sin escrituras", async (tipo) => {
    const resultado = await consultarCatalogoPresupuestoAction({ tipo, page: 2, limit: 10 });
    expect(resultado.ok).toBe(true);
    expect(tipo === "reparaciones" ? d.reparaciones : d.repuestos).toHaveBeenCalledWith(2, 10);
    expect(d.crear).not.toHaveBeenCalled(); expect(d.actualizar).not.toHaveBeenCalled(); sinExito();
  });
  it("corrige una página superior al total", async () => {
    const resultado = await consultarCatalogoPresupuestoAction({ tipo: "reparaciones", page: 99, limit: 10 });
    expect(resultado).toMatchObject({ ok: true, pagina: 2, total: 11 });
    expect(d.reparaciones.mock.calls).toEqual([[99, 10], [2, 10]]);
  });
  it.each([0, -1, "invalida", ["1", "2"], 1.5, "1e100", Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER])("rechaza página inválida %s", async (page) => {
    expect((await consultarCatalogoPresupuestoAction({ tipo: "reparaciones", page, limit: 10 })).ok).toBe(false);
    expect(d.reparaciones).not.toHaveBeenCalled();
  });
  it("rechaza un catálogo desconocido", async () => {
    expect((await consultarCatalogoPresupuestoAction({ tipo: "otro", page: 1, limit: 10 })).ok).toBe(false);
    expect(d.reparaciones).not.toHaveBeenCalled(); expect(d.repuestos).not.toHaveBeenCalled();
  });
});
