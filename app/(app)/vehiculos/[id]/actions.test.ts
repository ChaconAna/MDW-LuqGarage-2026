import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {},
  ErrorAutorizacion: class extends Error {},
  autorizar: vi.fn(), baja: vi.fn(), obtener: vi.fn(), revalidar: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  ErrorAutenticacion: deps.ErrorAutenticacion,
  ErrorAutorizacion: deps.ErrorAutorizacion,
  requerirRol: deps.autorizar,
}));
vi.mock("@/lib/db/vehiculo", () => ({ darDeBajaVehiculoPorId: deps.baja, obtenerVehiculoPorId: deps.obtener }));
vi.mock("@/lib/schemas/vehiculo", async () => import("../../../../lib/schemas/vehiculo"));
vi.mock("next/cache", () => ({ revalidatePath: deps.revalidar }));

import { darDeBajaVehiculoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const entrada = { id, confirmado: true };

beforeEach(() => {
  vi.resetAllMocks();
  deps.autorizar.mockResolvedValue({ rol: "RECEPCIONISTA" });
  deps.baja.mockResolvedValue(true);
});

describe("darDeBajaVehiculoAction", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza a %s y revalida después de la baja", async (rol) => {
    deps.autorizar.mockResolvedValue({ rol });
    const resultado = await darDeBajaVehiculoAction(entrada);
    expect(resultado.inactivo).toBe(true);
    expect(resultado.mensajeExito).toMatch(/Vehículo dado de baja/);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.autorizar.mock.invocationCallOrder[0]).toBeLessThan(deps.baja.mock.invocationCallOrder[0]!);
    expect(deps.baja).toHaveBeenCalledExactlyOnceWith(id, { soloSiActivo: true });
    expect(deps.revalidar.mock.calls).toEqual([
      ["/vehiculos"], [`/vehiculos/${id}`], [`/vehiculos/${id}/editar`], ["/siniestros/nuevo"],
    ]);
  });

  it.each([
    ["sin sesión", new deps.ErrorAutenticacion(), /sesión/],
    ["MECANICO", new deps.ErrorAutorizacion(), /permisos/],
    ["ADMINISTRADOR", new deps.ErrorAutorizacion(), /permisos/],
  ])("rechaza %s sin consultar ni escribir", async (_rol, error, mensaje) => {
    deps.autorizar.mockRejectedValue(error);
    expect((await darDeBajaVehiculoAction(entrada)).errorGeneral).toMatch(mensaje as RegExp);
    expect(deps.baja).not.toHaveBeenCalled();
    expect(deps.obtener).not.toHaveBeenCalled();
    expect(deps.revalidar).not.toHaveBeenCalled();
  });

  it.each([
    { id: "inválido", confirmado: true }, { id: "", confirmado: true },
    { id }, { id, confirmado: false }, { id, confirmado: "true" },
    { ...entrada, activo: true }, null,
  ])("rechaza ID o confirmación inválidos: %j", async (datos) => {
    expect((await darDeBajaVehiculoAction(datos)).errorGeneral).toMatch(/identificador o la confirmación/);
    expect(deps.baja).not.toHaveBeenCalled();
    expect(deps.revalidar).not.toHaveBeenCalled();
  });

  it("informa un vehículo inexistente sin anunciar éxito", async () => {
    deps.baja.mockResolvedValue(false);
    deps.obtener.mockResolvedValue(null);
    expect(await darDeBajaVehiculoAction(entrada)).toEqual({ errorGeneral: "Vehículo no encontrado." });
    expect(deps.obtener).toHaveBeenCalledWith(id);
    expect(deps.revalidar).not.toHaveBeenCalled();
  });

  it("rechaza una baja duplicada, incluida una confirmada por otra sesión", async () => {
    deps.baja.mockResolvedValue(false);
    deps.obtener.mockResolvedValue({ id, activo: false });
    expect(await darDeBajaVehiculoAction(entrada)).toEqual({
      errorGeneral: "El vehículo ya está dado de baja.", inactivo: true,
    });
    expect(deps.baja).toHaveBeenCalledOnce();
    expect(deps.revalidar.mock.calls).toEqual([["/vehiculos"], [`/vehiculos/${id}`]]);
  });

  it("maneja errores inesperados sin exponer detalles ni reintentar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      deps.baja.mockRejectedValue(new Error("secreto-simulado"));
      const resultado = await darDeBajaVehiculoAction(entrada);
      expect(resultado.errorGeneral).toMatch(/No pudimos confirmar la baja/);
      expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
      expect(deps.baja).toHaveBeenCalledOnce();
      expect(deps.revalidar).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
