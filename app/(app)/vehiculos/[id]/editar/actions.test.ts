import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {}, ErrorAutorizacion: class extends Error {},
  autorizar: vi.fn(), actualizar: vi.fn(), modelo: vi.fn(),
  revalidar: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ ErrorAutenticacion: deps.ErrorAutenticacion, ErrorAutorizacion: deps.ErrorAutorizacion, requerirRol: deps.autorizar }));
vi.mock("@/lib/db/vehiculo", () => ({ actualizarVehiculoPorId: deps.actualizar }));
vi.mock("@/lib/db/modelo", () => ({ obtenerModeloPorId: deps.modelo }));
vi.mock("@/lib/schemas/altaVehiculo", async () => import("../../../../../lib/schemas/altaVehiculo"));
vi.mock("@/lib/schemas/vehiculo", async () => import("../../../../../lib/schemas/vehiculo"));
vi.mock("next/cache", () => ({ revalidatePath: deps.revalidar }));
vi.mock("next/navigation", () => ({ redirect: deps.redirect }));

import { actualizarVehiculoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const marcaId = "20000000-0000-4000-8000-000000000002";
const datos = { patente: "AA123BB", marcaId, modeloId: id, tipoVehiculoId: id };
const redireccion = new Error("REDIRECT");

beforeEach(() => {
  vi.resetAllMocks();
  deps.autorizar.mockResolvedValue({ rol: "RECEPCIONISTA" });
  deps.modelo.mockResolvedValue({ id, marcaId });
  deps.actualizar.mockResolvedValue({ actualizado: true, vehiculo: { id } });
  deps.redirect.mockImplementation(() => { throw redireccion; });
});

describe("edición de Vehículo", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza a %s y actualiza sin persistir Marca, Cliente ni estado del cliente HTTP", async (rol) => {
    deps.autorizar.mockResolvedValue({ rol });
    await expect(actualizarVehiculoAction(id, { errores: {} }, datos)).rejects.toBe(redireccion);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.autorizar.mock.invocationCallOrder[0]).toBeLessThan(deps.modelo.mock.invocationCallOrder[0]!);
    expect(deps.modelo).toHaveBeenCalledExactlyOnceWith(id);
    expect(deps.actualizar).toHaveBeenCalledExactlyOnceWith(id, { patente: datos.patente, modeloId: id, tipoVehiculoId: id });
    expect(deps.revalidar.mock.calls).toEqual([["/vehiculos"], [`/vehiculos/${id}`], [`/vehiculos/${id}/editar`], ["/siniestros/nuevo"]]);
    expect(deps.redirect).toHaveBeenCalledWith(`/vehiculos/${id}`);
  });

  it.each([
    ["sin sesión", new deps.ErrorAutenticacion()], ["MECANICO", new deps.ErrorAutorizacion()], ["ADMINISTRADOR", new deps.ErrorAutorizacion()],
  ])("rechaza %s antes de consultar o persistir", async (_rol, error) => {
    deps.autorizar.mockRejectedValue(error);
    expect((await actualizarVehiculoAction(id, { errores: {} }, datos)).errorGeneral).toBeTruthy();
    expect(deps.modelo).not.toHaveBeenCalled();
    expect(deps.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza campos vacíos y UUID inválidos sin persistir", async () => {
    const resultado = await actualizarVehiculoAction(id, { errores: {} }, { patente: "  ", marcaId: "", modeloId: "inválido", tipoVehiculoId: "" });
    expect(Object.keys(resultado.errores).sort()).toEqual(Object.keys(datos).sort());
    expect(deps.modelo).not.toHaveBeenCalled();
    expect(deps.actualizar).not.toHaveBeenCalled();
  });

  it.each([{ ...datos, activo: true }, { ...datos, activo: false }, { ...datos, clienteId: id }, null, {}])("rechaza entradas ajenas a la edición: %j", async (entrada) => {
    expect((await actualizarVehiculoAction(id, { errores: {} }, entrada)).errorGeneral).toBeTruthy();
    expect(deps.actualizar).not.toHaveBeenCalled();
  });

  it("conserva la patente sin normalizaciones no definidas", async () => {
    await expect(actualizarVehiculoAction(id, { errores: {} }, { ...datos, patente: " ab-123 " })).rejects.toBe(redireccion);
    expect(deps.actualizar.mock.calls[0]?.[1]).toMatchObject({ patente: " ab-123 " });
  });

  it("rechaza Modelo inexistente", async () => {
    deps.modelo.mockResolvedValue(null);
    expect((await actualizarVehiculoAction(id, { errores: {} }, datos)).errores.modeloId).toMatch(/no está disponible/);
    expect(deps.actualizar).not.toHaveBeenCalled();
  });

  it("verifica en servidor que el Modelo pertenezca a la Marca seleccionada", async () => {
    deps.modelo.mockResolvedValue({ id, marcaId: id });
    expect((await actualizarVehiculoAction(id, { errores: {} }, datos)).errores.modeloId).toMatch(/no pertenece/);
    expect(deps.actualizar).not.toHaveBeenCalled();
  });

  it.each(["PATENTE_DUPLICADA", "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO", "VEHICULO_NO_ENCONTRADO"])("maneja %s sin redirigir", async (motivo) => {
    deps.actualizar.mockResolvedValue({ actualizado: false, motivo });
    const resultado = await actualizarVehiculoAction(id, { errores: {} }, datos);
    expect(resultado.errorGeneral).toBeTruthy();
    if (motivo === "PATENTE_DUPLICADA") expect(resultado.errores.patente).toMatch(/Ya existe/);
    else if (motivo === "VEHICULO_NO_ENCONTRADO") expect(resultado.errorGeneral).toBe("Vehículo no encontrado.");
    else expect(resultado.errores).toHaveProperty("tipoVehiculoId");
    expect(deps.revalidar).not.toHaveBeenCalled();
    expect(deps.redirect).not.toHaveBeenCalled();
  });

  it("maneja errores inesperados sin filtrar detalles ni reintentar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      deps.actualizar.mockRejectedValue(new Error("secreto-simulado"));
      const resultado = await actualizarVehiculoAction(id, { errores: {} }, datos);
      expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
      expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
      expect(deps.actualizar).toHaveBeenCalledOnce();
    } finally { log.mockRestore(); }
  });
});

it("rechaza un identificador inválido antes de consultar", async () => {
  expect((await actualizarVehiculoAction("inválido", { errores: {} }, datos)).errorGeneral).toMatch(/id/);
  expect(deps.modelo).not.toHaveBeenCalled();
  expect(deps.actualizar).not.toHaveBeenCalled();
});
it.each([true, false])("no envía activo a persistencia aunque el vehículo tenga activo=%s", async (activo) => {
  deps.actualizar.mockResolvedValue({ actualizado: true, vehiculo: { id, activo } });
  await expect(actualizarVehiculoAction(id, { errores: {} }, datos)).rejects.toBe(redireccion);
  expect(deps.actualizar.mock.calls[0]?.[1]).not.toHaveProperty("activo");
});
