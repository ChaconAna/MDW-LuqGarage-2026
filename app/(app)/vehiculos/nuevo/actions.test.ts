import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {}, ErrorAutorizacion: class extends Error {},
  autorizar: vi.fn(), crear: vi.fn(), modelo: vi.fn(), marcas: vi.fn(), modelos: vi.fn(), tipos: vi.fn(),
  revalidar: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ ErrorAutenticacion: deps.ErrorAutenticacion, ErrorAutorizacion: deps.ErrorAutorizacion, requerirRol: deps.autorizar }));
vi.mock("@/lib/db/vehiculo", () => ({ crearVehiculo: deps.crear }));
vi.mock("@/lib/db/marca", () => ({ listarMarcas: deps.marcas }));
vi.mock("@/lib/db/modelo", () => ({ obtenerModeloPorId: deps.modelo, listarModelosPorMarca: deps.modelos }));
vi.mock("@/lib/db/tipoVehiculo", () => ({ listarTiposVehiculo: deps.tipos }));
vi.mock("@/lib/schemas/altaVehiculo", async () => import("../../../../lib/schemas/altaVehiculo"));
vi.mock("next/cache", () => ({ revalidatePath: deps.revalidar }));
vi.mock("next/navigation", () => ({ redirect: deps.redirect }));

import { crearVehiculoAction, consultarCatalogoVehiculoAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const marcaId = "20000000-0000-4000-8000-000000000002";
const datos = { patente: "AA123BB", marcaId, modeloId: id, tipoVehiculoId: id };
const redireccion = new Error("REDIRECT");

beforeEach(() => {
  vi.resetAllMocks();
  deps.autorizar.mockResolvedValue({ rol: "RECEPCIONISTA" });
  deps.modelo.mockResolvedValue({ id, marcaId });
  deps.crear.mockResolvedValue({ creado: true, vehiculo: { id } });
  for (const consulta of [deps.marcas, deps.modelos, deps.tipos]) consulta.mockResolvedValue({ opciones: [{ id, nombre: "Opción" }], total: 11 });
  deps.redirect.mockImplementation(() => { throw redireccion; });
});

describe("alta de Vehículo", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza a %s y crea sin persistir Marca, Cliente ni estado del cliente HTTP", async (rol) => {
    deps.autorizar.mockResolvedValue({ rol });
    await expect(crearVehiculoAction({ errores: {} }, datos)).rejects.toBe(redireccion);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.autorizar.mock.invocationCallOrder[0]).toBeLessThan(deps.modelo.mock.invocationCallOrder[0]!);
    expect(deps.modelo).toHaveBeenCalledExactlyOnceWith(id);
    expect(deps.crear).toHaveBeenCalledExactlyOnceWith({ patente: datos.patente, modeloId: id, tipoVehiculoId: id });
    expect(deps.revalidar.mock.calls).toEqual([["/vehiculos"], [`/vehiculos/${id}`], ["/siniestros/nuevo"]]);
    expect(deps.redirect).toHaveBeenCalledWith(`/vehiculos/${id}`);
  });

  it.each([
    ["sin sesión", new deps.ErrorAutenticacion()], ["MECANICO", new deps.ErrorAutorizacion()], ["ADMINISTRADOR", new deps.ErrorAutorizacion()],
  ])("rechaza %s antes de consultar o persistir", async (_rol, error) => {
    deps.autorizar.mockRejectedValue(error);
    expect((await crearVehiculoAction({ errores: {} }, datos)).errorGeneral).toBeTruthy();
    expect(deps.modelo).not.toHaveBeenCalled();
    expect(deps.crear).not.toHaveBeenCalled();
  });

  it("rechaza campos vacíos y UUID inválidos sin persistir", async () => {
    const resultado = await crearVehiculoAction({ errores: {} }, { patente: "  ", marcaId: "", modeloId: "inválido", tipoVehiculoId: "" });
    expect(Object.keys(resultado.errores).sort()).toEqual(Object.keys(datos).sort());
    expect(deps.modelo).not.toHaveBeenCalled();
    expect(deps.crear).not.toHaveBeenCalled();
  });

  it.each([{ ...datos, activo: false }, { ...datos, clienteId: id }, null, {}])("rechaza entradas ajenas al alta: %j", async (entrada) => {
    expect((await crearVehiculoAction({ errores: {} }, entrada)).errorGeneral).toBeTruthy();
    expect(deps.crear).not.toHaveBeenCalled();
  });

  it("conserva la patente sin normalizaciones no definidas", async () => {
    await expect(crearVehiculoAction({ errores: {} }, { ...datos, patente: " ab-123 " })).rejects.toBe(redireccion);
    expect(deps.crear.mock.calls[0]?.[0]).toMatchObject({ patente: " ab-123 " });
  });

  it("rechaza Modelo inexistente", async () => {
    deps.modelo.mockResolvedValue(null);
    expect((await crearVehiculoAction({ errores: {} }, datos)).errores.modeloId).toMatch(/no está disponible/);
    expect(deps.crear).not.toHaveBeenCalled();
  });

  it("verifica en servidor que el Modelo pertenezca a la Marca seleccionada", async () => {
    deps.modelo.mockResolvedValue({ id, marcaId: id });
    expect((await crearVehiculoAction({ errores: {} }, datos)).errores.modeloId).toMatch(/no pertenece/);
    expect(deps.crear).not.toHaveBeenCalled();
  });

  it.each(["PATENTE_DUPLICADA", "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO"])("maneja %s sin redirigir", async (motivo) => {
    deps.crear.mockResolvedValue({ creado: false, motivo });
    const resultado = await crearVehiculoAction({ errores: {} }, datos);
    expect(resultado.errorGeneral).toBeTruthy();
    if (motivo === "PATENTE_DUPLICADA") expect(resultado.errores.patente).toMatch(/Ya existe/);
    else expect(resultado.errores).toHaveProperty("tipoVehiculoId");
    expect(deps.revalidar).not.toHaveBeenCalled();
    expect(deps.redirect).not.toHaveBeenCalled();
  });

  it("maneja errores inesperados sin filtrar detalles ni reintentar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      deps.crear.mockRejectedValue(new Error("secreto-simulado"));
      const resultado = await crearVehiculoAction({ errores: {} }, datos);
      expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
      expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
      expect(deps.crear).toHaveBeenCalledOnce();
    } finally { log.mockRestore(); }
  });
});

describe("catálogos del alta", () => {
  it.each(["marcas", "tipos", "modelos"] as const)("pagina %s y filtra Modelos por Marca", async (tipo) => {
    const resultado = await consultarCatalogoVehiculoAction({ tipo, page: 2, limit: 10, ...(tipo === "modelos" ? { marcaId } : {}) });
    expect(resultado).toMatchObject({ ok: true, pagina: 2, total: 11 });
    const consulta = tipo === "marcas" ? deps.marcas : tipo === "tipos" ? deps.tipos : deps.modelos;
    expect(consulta.mock.calls).toEqual([tipo === "modelos" ? [marcaId, 2, 10] : [2, 10]]);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
  });

  it("corrige una página fuera de rango", async () => {
    expect(await consultarCatalogoVehiculoAction({ tipo: "marcas", page: 99, limit: 10 })).toMatchObject({ ok: true, pagina: 2 });
    expect(deps.marcas.mock.calls).toEqual([[99, 10], [2, 10]]);
  });

  it.each([{ tipo: "modelos" }, { tipo: "modelos", marcaId: "inválido" }, { tipo: "marcas", page: 0 }, { tipo: "tipos", limit: 101 }, { tipo: "otro" }])("valida el catálogo: %j", async (entrada) => {
    expect((await consultarCatalogoVehiculoAction(entrada)).ok).toBe(false);
    for (const consulta of [deps.marcas, deps.modelos, deps.tipos]) expect(consulta).not.toHaveBeenCalled();
  });

  it("autoriza antes de consultar catálogos", async () => {
    deps.autorizar.mockRejectedValue(new deps.ErrorAutorizacion());
    expect((await consultarCatalogoVehiculoAction({ tipo: "marcas" })).ok).toBe(false);
    expect(deps.marcas).not.toHaveBeenCalled();
  });
});
