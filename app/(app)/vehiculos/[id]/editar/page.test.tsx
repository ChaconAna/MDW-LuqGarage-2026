import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ autorizar: vi.fn(), marcas: vi.fn(), tipos: vi.fn(), formulario: vi.fn(), obtener: vi.fn(), guardar: vi.fn() }));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: deps.autorizar }));
vi.mock("@/lib/db/marca", () => ({ listarMarcas: deps.marcas }));
vi.mock("@/lib/db/tipoVehiculo", () => ({ listarTiposVehiculo: deps.tipos }));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("@/components/vehiculos/FormularioVehiculo", () => ({ default: deps.formulario }));
vi.mock("@/components/layout/ContenedorPagina", () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@/lib/db/vehiculo", () => ({ obtenerVehiculoPorId: deps.obtener }));
vi.mock("./actions", () => ({ actualizarVehiculoAction: deps.guardar }));
vi.mock("@/lib/schemas/vehiculo", async () => import("../../../../../lib/schemas/vehiculo"));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import VehiculoEditarPage from "./page";
const id = "10000000-0000-4000-8000-000000000001";
const vehiculo = { id, patente: "AA123BB", activo: false, modelo: { id: "modelo", nombre: "Modelo", marca: { id: "otra-marca", nombre: "Otra Marca" } }, tipoVehiculo: { id: "otro-tipo", nombre: "Otro Tipo" } };
const paginaEditar = () => VehiculoEditarPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  deps.obtener.mockResolvedValue(vehiculo);
  deps.autorizar.mockResolvedValue({ autorizado: true });
  deps.marcas.mockResolvedValue({ opciones: [{ id: "marca", nombre: "Marca" }], total: 11 });
  deps.tipos.mockResolvedValue({ opciones: [{ id: "tipo", nombre: "Automóvil" }], total: 1 });
  deps.formulario.mockReturnValue(React.createElement("form"));
});

describe("página de edición de Vehículo", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza a %s y carga catálogos paginados", async (rol) => {
    deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const pagina = renderToStaticMarkup(await paginaEditar());
    expect(pagina).toContain("Editar vehículo");
    expect(pagina).toContain(`href="/vehiculos/${id}"`);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.marcas).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.tipos).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.formulario.mock.calls[0]?.[0]).toMatchObject({
      vehiculoInicial: vehiculo, hrefCancelar: `/vehiculos/${id}`, guardarAction: expect.any(Function),
      marcasIniciales: { pagina: 1, total: 11 }, tiposIniciales: { pagina: 1, total: 1 },
    });
  });
  it.each(["MECANICO", "ADMINISTRADOR"])("deniega a %s antes de consultar", async () => {
    deps.autorizar.mockResolvedValue({ autorizado: false });
    expect(renderToStaticMarkup(await paginaEditar())).toContain("Acceso denegado");
    expect(deps.obtener).not.toHaveBeenCalled();
    expect(deps.marcas).not.toHaveBeenCalled();
    expect(deps.tipos).not.toHaveBeenCalled();
    expect(deps.formulario).not.toHaveBeenCalled();
  });
  it("propaga errores de catálogo al límite de error existente", async () => {
    const error = new Error("fallo");
    deps.marcas.mockRejectedValue(error);
    await expect(paginaEditar()).rejects.toBe(error);
  });
});

it("rechaza ID inválido sin consultar", async () => {
  await expect(VehiculoEditarPage({ params: Promise.resolve({ id: "inválido" }) })).rejects.toThrow("NOT_FOUND");
  expect(deps.obtener).not.toHaveBeenCalled();
});
it("resuelve vehículo inexistente con notFound", async () => {
  deps.obtener.mockResolvedValue(null);
  await expect(paginaEditar()).rejects.toThrow("NOT_FOUND");
  expect(deps.marcas).not.toHaveBeenCalled();
});
it("vincula la acción al identificador precargado", async () => {
  renderToStaticMarkup(await paginaEditar());
  await deps.formulario.mock.calls[0]?.[0].guardarAction({ errores: {} }, { patente: "nueva" });
  expect(deps.guardar).toHaveBeenCalledWith(id, { errores: {} }, { patente: "nueva" });
});
