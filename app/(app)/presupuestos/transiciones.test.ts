import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({
  auth: vi.fn(), usuario: vi.fn(), enviar: vi.fn(), aprobar: vi.fn(), rechazar: vi.fn(),
  crear: vi.fn(), actualizar: vi.fn(), revalidatePath: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: d.auth }));
vi.mock("@/lib/db/usuario", () => ({ obtenerUsuarioParaAutorizacionPorId: d.usuario }));
// Usamos la autorización real, con sesión y usuario de base simulados.
vi.mock("@/lib/auth", async () => import("../../../lib/auth"));
vi.mock("@/lib/db/presupuesto", () => ({
  enviarPresupuestoPorId: d.enviar, aprobarPresupuestoPorId: d.aprobar, rechazarPresupuestoPorId: d.rechazar,
  crearPresupuesto: d.crear, actualizarPresupuestoPorId: d.actualizar,
}));
vi.mock("@/lib/db/reparacion", () => ({ listarReparaciones: vi.fn() }));
vi.mock("@/lib/db/repuesto", () => ({ listarRepuestos: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: d.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: d.redirect }));
vi.mock("@/lib/schemas/presupuesto", async () => import("../../../lib/schemas/presupuesto"));
vi.mock("@/lib/schemas/catalogoPresupuesto", async () => import("../../../lib/schemas/catalogoPresupuesto"));
vi.mock("@/lib/services/presupuestoFormulario", async () => import("../../../lib/services/presupuestoFormulario"));

import { registrarEnvioPresupuestoAction, registrarAprobacionPresupuestoAction, registrarRechazoPresupuestoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const siniestroId = "20000000-0000-4000-8000-000000000002";
const usuarioId = "30000000-0000-4000-8000-000000000003";
const casos = [
  { nombre: "envío", accion: registrarEnvioPresupuestoAction, persistir: d.enviar, indicador: "enviado", destino: "ENVIADO", motivo: "PRESUPUESTO_NO_ENVIABLE", incompatibles: ["ENVIADO", "APROBADO", "RECHAZADO"] },
  { nombre: "aprobación", accion: registrarAprobacionPresupuestoAction, persistir: d.aprobar, indicador: "aprobado", destino: "APROBADO", motivo: "PRESUPUESTO_NO_APROBABLE", incompatibles: ["BORRADOR", "APROBADO", "RECHAZADO"] },
  { nombre: "rechazo", accion: registrarRechazoPresupuestoAction, persistir: d.rechazar, indicador: "rechazado", destino: "RECHAZADO", motivo: "PRESUPUESTO_NO_RECHAZABLE", incompatibles: ["BORRADOR", "APROBADO", "RECHAZADO"] },
] as const;

beforeEach(() => {
  vi.resetAllMocks();
  d.auth.mockResolvedValue({ user: { usuarioId, rol: "ENCARGADO_DEL_TALLER" } });
  d.usuario.mockResolvedValue({ id: usuarioId, activo: true, rol: "ENCARGADO_DEL_TALLER" });
  for (const caso of casos) caso.persistir.mockResolvedValue({
    [caso.indicador]: true, presupuesto: { id, estado: caso.destino, siniestro: { id: siniestroId } },
  });
});
afterEach(() => vi.restoreAllMocks());

function sinCambioConfirmado() {
  expect(d.revalidatePath).not.toHaveBeenCalled();
  expect(d.redirect).not.toHaveBeenCalled();
}

describe.each(casos)("registro de $nombre", (caso) => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza %s y ejecuta sólo su transición", async (rol) => {
    d.usuario.mockResolvedValue({ id: usuarioId, activo: true, rol });
    const resultado = await caso.accion(id);
    expect(resultado.mensajeExito).toBeTruthy(); expect(resultado.errorGeneral).toBeUndefined();
    expect(d.auth).toHaveBeenCalledOnce(); expect(d.usuario).toHaveBeenCalledWith(usuarioId);
    expect(caso.persistir).toHaveBeenCalledExactlyOnceWith(id);
    expect(d.usuario.mock.invocationCallOrder[0]).toBeLessThan(caso.persistir.mock.invocationCallOrder[0]!);
    for (const otro of casos) if (otro !== caso) expect(otro.persistir).not.toHaveBeenCalled();
    expect(d.crear).not.toHaveBeenCalled(); expect(d.actualizar).not.toHaveBeenCalled();
    expect(d.revalidatePath.mock.calls).toEqual([
      [`/presupuestos/${id}`], [`/presupuestos/${id}/editar`], [`/siniestros/${siniestroId}`],
    ]);
    expect(caso.persistir.mock.invocationCallOrder[0]).toBeLessThan(d.revalidatePath.mock.invocationCallOrder[0]!);
    expect(d.redirect).not.toHaveBeenCalled();
  });

  it.each(["MECANICO", "ADMINISTRADOR"])("rechaza el rol %s antes de persistir", async (rol) => {
    d.usuario.mockResolvedValue({ id: usuarioId, activo: true, rol });
    expect((await caso.accion(id)).errorGeneral).toMatch(/permisos/);
    expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("rechaza una sesión ausente", async () => {
    d.auth.mockResolvedValue(null);
    expect((await caso.accion(id)).errorGeneral).toMatch(/sesión/);
    expect(d.usuario).not.toHaveBeenCalled(); expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("rechaza un usuario inactivo aunque conserve sesión", async () => {
    d.usuario.mockResolvedValue({ id: usuarioId, activo: false, rol: "ENCARGADO_DEL_TALLER" });
    expect((await caso.accion(id)).errorGeneral).toMatch(/sesión/);
    expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("rechaza un usuario que dejó de existir", async () => {
    d.usuario.mockResolvedValue(null);
    expect((await caso.accion(id)).errorGeneral).toMatch(/sesión/);
    expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("no conserva permisos del JWT después de un cambio de rol", async () => {
    d.usuario.mockResolvedValue({ id: usuarioId, activo: true, rol: "MECANICO" });
    expect((await caso.accion(id)).errorGeneral).toMatch(/permisos/);
    expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("utiliza el rol vigente aunque el JWT tenga un rol anterior", async () => {
    d.auth.mockResolvedValue({ user: { usuarioId, rol: "MECANICO" } });
    expect((await caso.accion(id)).mensajeExito).toBeTruthy();
    expect(caso.persistir).toHaveBeenCalledOnce();
  });

  it.each(["invalido", "", undefined, [id], { id }])("rechaza UUID inválido: %s", async (valor) => {
    expect((await caso.accion(valor)).errorGeneral).toMatch(/válido/);
    expect(caso.persistir).not.toHaveBeenCalled(); sinCambioConfirmado();
  });

  it("informa presupuesto inexistente sin confirmar éxito", async () => {
    caso.persistir.mockResolvedValue({ [caso.indicador]: false, motivo: "PRESUPUESTO_NO_ENCONTRADO" });
    expect(await caso.accion(id)).toEqual({ errorGeneral: "El presupuesto ya no existe." });
    sinCambioConfirmado();
  });

  it.each(caso.incompatibles)("informa el cambio concurrente o estado incompatible %s", async () => {
    caso.persistir.mockResolvedValue({ [caso.indicador]: false, motivo: caso.motivo });
    const resultado = await caso.accion(id);
    expect(resultado.errorGeneral).toMatch(/ya no está/); expect(resultado.mensajeExito).toBeUndefined();
    expect(caso.persistir).toHaveBeenCalledOnce(); sinCambioConfirmado();
  });

  it("maneja una excepción sin exponer información técnica ni reintentar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    caso.persistir.mockRejectedValue(new Error("secreto-simulado"));
    const resultado = await caso.accion(id);
    expect(resultado.errorGeneral).toMatch(/Actualizá el detalle/);
    expect(resultado.mensajeExito).toBeUndefined();
    expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
    expect(caso.persistir).toHaveBeenCalledOnce(); sinCambioConfirmado();
  });
});

it("informa incertidumbre si falla la actualización de las vistas después de persistir", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  d.revalidatePath.mockImplementation(() => { throw new Error("Fallo de caché simulado"); });
  const resultado = await registrarEnvioPresupuestoAction(id);
  expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
  expect(resultado.mensajeExito).toBeUndefined(); expect(d.enviar).toHaveBeenCalledOnce();
  expect(d.redirect).not.toHaveBeenCalled();
});
