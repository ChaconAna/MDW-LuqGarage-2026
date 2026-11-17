import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ autorizar: vi.fn(), marcas: vi.fn(), tipos: vi.fn(), formulario: vi.fn() }));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: deps.autorizar }));
vi.mock("@/lib/db/marca", () => ({ listarMarcas: deps.marcas }));
vi.mock("@/lib/db/tipoVehiculo", () => ({ listarTiposVehiculo: deps.tipos }));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("@/components/vehiculos/FormularioVehiculo", () => ({ default: deps.formulario }));
vi.mock("@/components/layout/ContenedorPagina", () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
import VehiculoNuevoPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  deps.autorizar.mockResolvedValue({ autorizado: true });
  deps.marcas.mockResolvedValue({ opciones: [{ id: "marca", nombre: "Marca" }], total: 11 });
  deps.tipos.mockResolvedValue({ opciones: [{ id: "tipo", nombre: "Automóvil" }], total: 1 });
  deps.formulario.mockReturnValue(React.createElement("form"));
});

describe("página de alta de Vehículo", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("autoriza a %s y carga catálogos paginados", async (rol) => {
    deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const pagina = renderToStaticMarkup(await VehiculoNuevoPage());
    expect(pagina).toContain("Registrar vehículo");
    expect(pagina).toContain('href="/vehiculos"');
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.marcas).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.tipos).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.formulario.mock.calls[0]?.[0]).toMatchObject({
      marcasIniciales: { pagina: 1, total: 11 }, tiposIniciales: { pagina: 1, total: 1 },
    });
  });
  it.each(["MECANICO", "ADMINISTRADOR"])("deniega a %s antes de consultar", async () => {
    deps.autorizar.mockResolvedValue({ autorizado: false });
    expect(renderToStaticMarkup(await VehiculoNuevoPage())).toContain("Acceso denegado");
    expect(deps.marcas).not.toHaveBeenCalled();
    expect(deps.tipos).not.toHaveBeenCalled();
    expect(deps.formulario).not.toHaveBeenCalled();
  });
  it("propaga errores de catálogo al límite de error existente", async () => {
    const error = new Error("fallo");
    deps.marcas.mockRejectedValue(error);
    await expect(VehiculoNuevoPage()).rejects.toBe(error);
  });
});
