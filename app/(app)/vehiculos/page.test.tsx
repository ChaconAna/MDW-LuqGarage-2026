import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  autorizar: vi.fn(), auth: vi.fn(), listar: vi.fn(), obtener: vi.fn(),
  redirect: vi.fn(), notFound: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: deps.auth, signOut: vi.fn() }));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: deps.autorizar }));
vi.mock("@/lib/db/vehiculo", () => ({ listarVehiculos: deps.listar, obtenerVehiculoPorId: deps.obtener }));
vi.mock("@/lib/schemas/vehiculo", async () => import("../../../lib/schemas/vehiculo"));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("next/navigation", () => ({ redirect: deps.redirect, notFound: deps.notFound }));
vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return React.createElement("a", props, children);
  },
}));
vi.mock("@/components/layout/ContenedorPagina", () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children),
}));
vi.mock("@/components/vehiculos/TablaVehiculos", async () => import("../../../components/vehiculos/TablaVehiculos"));
vi.mock("@/components/ui/button", () => ({
  Button: ({ asChild, variant, size, children, ...props }: React.ComponentProps<"button"> & {
    asChild?: boolean; variant?: string; size?: string;
  }) => {
    void variant;
    void size;
    return asChild ? React.createElement(React.Fragment, {}, children) : React.createElement("button", props, children);
  },
}));

import VehiculosPage from "./page";
import VehiculoDetallePage from "./[id]/page";
import LoadingVehiculos from "./loading";
import LoadingVehiculoDetalle from "./[id]/loading";
import VehiculosError from "./error";
import VehiculoDetalleError from "./[id]/error";
import AppLayout from "../layout";

const id = "10000000-0000-4000-8000-000000000001";
const redireccion = new Error("REDIRECT");
const noEncontrado = new Error("NOT_FOUND");
const html = renderToStaticMarkup;

function vehiculo(indice: number, activo = true) {
  return {
    id: `10000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
    patente: `AA${String(indice).padStart(3, "0")}BB`,
    activo,
    modelo: { id: "modelo", nombre: `Modelo ${indice}`, marca: { id: "marca", nombre: `Marca ${indice}` } },
    tipoVehiculo: { id: "tipo", nombre: "Automóvil" },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol: "RECEPCIONISTA" } });
  deps.auth.mockResolvedValue({ user: { email: "prueba@ejemplo.test" } });
  deps.listar.mockResolvedValue({ vehiculos: [vehiculo(1), vehiculo(2, false)], total: 2 });
  deps.obtener.mockResolvedValue(vehiculo(1));
  deps.redirect.mockImplementation(() => { throw redireccion; });
  deps.notFound.mockImplementation(() => { throw noEncontrado; });
});

describe("listado de Vehículos", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("muestra activos e inactivos con Modelo → Marca para %s", async (rol) => {
    deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const pagina = html(await VehiculosPage({ searchParams: Promise.resolve({}) }));
    for (const texto of ["AA001BB", "AA002BB", "Modelo 1", "Marca 1", "Automóvil", "Activo", "Inactivo"]) {
      expect(pagina).toContain(texto);
    }
    expect(pagina).toContain(`href="/vehiculos/${id}"`);
    expect(pagina).toContain("Página 1 de 1");
    expect(pagina).toContain("Página anterior no disponible");
    expect(pagina).toContain("Página siguiente no disponible");
    expect(deps.listar).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.autorizar.mock.invocationCallOrder[0]).toBeLessThan(deps.listar.mock.invocationCallOrder[0]!);
    expect(pagina).toContain('href="/vehiculos/nuevo"');
    expect(pagina).not.toContain("Cliente");
  });

  it.each(["MECANICO", "ADMINISTRADOR"])("deniega a %s antes de consultar", async () => {
    deps.autorizar.mockResolvedValue({ autorizado: false });
    const pagina = html(await VehiculosPage({ searchParams: Promise.resolve({}) }));
    expect(pagina).toContain("Acceso denegado");
    expect(deps.listar).not.toHaveBeenCalled();
  });

  it("pagina once vehículos sin duplicados ni omisiones", async () => {
    const vehiculos = Array.from({ length: 11 }, (_, indice) => vehiculo(indice + 1, indice % 2 === 0));
    deps.listar.mockImplementation(async (page: number, limit: number) => ({
      vehiculos: vehiculos.slice((page - 1) * limit, page * limit), total: vehiculos.length,
    }));
    const primera = html(await VehiculosPage({ searchParams: Promise.resolve({}) }));
    const ultima = html(await VehiculosPage({ searchParams: Promise.resolve({ page: "2" }) }));
    for (const [indice, datos] of vehiculos.entries()) {
      expect(primera.includes(datos.patente)).toBe(indice < 10);
      expect(ultima.includes(datos.patente)).toBe(indice === 10);
    }
    expect(primera).toContain('href="/vehiculos?page=2"');
    expect(ultima).toContain('href="/vehiculos"');
    expect(ultima).toContain("Página 2 de 2");
  });

  it.each(["0", "-1", "abc", "1.5", "", ["1", "2"]])("redirige una página inválida %j sin consultar", async (page) => {
    await expect(VehiculosPage({ searchParams: Promise.resolve({ page }) })).rejects.toBe(redireccion);
    expect(deps.redirect).toHaveBeenCalledWith("/vehiculos");
    expect(deps.listar).not.toHaveBeenCalled();
  });

  it.each([[11, "/vehiculos?page=2"], [0, "/vehiculos"]])("corrige la página fuera de rango para %s registros", async (total, destino) => {
    deps.listar.mockResolvedValue({ vehiculos: [], total });
    await expect(VehiculosPage({ searchParams: Promise.resolve({ page: "99" }) })).rejects.toBe(redireccion);
    expect(deps.redirect).toHaveBeenCalledWith(destino);
  });

  it("muestra el listado vacío sin tabla ni paginación", async () => {
    deps.listar.mockResolvedValue({ vehiculos: [], total: 0 });
    const pagina = html(await VehiculosPage({ searchParams: Promise.resolve({}) }));
    expect(pagina).toContain("No hay vehículos registrados");
    expect(pagina).not.toContain("<table");
    expect(pagina).not.toContain("Paginación de vehículos");
  });
});

describe("detalle de Vehículo", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("muestra datos y vuelta al listado para %s", async (rol) => {
    deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const pagina = html(await VehiculoDetallePage({ params: Promise.resolve({ id }) }));
    for (const texto of [id, "AA001BB", "Modelo 1", "Marca 1", "Automóvil", "Activo", "Volver a vehículos"]) {
      expect(pagina).toContain(texto);
    }
    expect(pagina).toContain('href="/vehiculos"');
    expect(pagina).not.toContain("Editar");
    expect(pagina).not.toContain("Dar de baja");
    expect(pagina).not.toContain("Cliente");
    expect(deps.obtener).toHaveBeenCalledExactlyOnceWith(id);
    expect(deps.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(deps.autorizar.mock.invocationCallOrder[0]).toBeLessThan(deps.obtener.mock.invocationCallOrder[0]!);
  });

  it("permite consultar vehículos inactivos", async () => {
    deps.obtener.mockResolvedValue(vehiculo(1, false));
    expect(html(await VehiculoDetallePage({ params: Promise.resolve({ id }) }))).toContain("Inactivo");
  });

  it.each(["MECANICO", "ADMINISTRADOR"])("deniega a %s antes de consultar", async () => {
    deps.autorizar.mockResolvedValue({ autorizado: false });
    expect(html(await VehiculoDetallePage({ params: Promise.resolve({ id }) }))).toContain("Acceso denegado");
    expect(deps.obtener).not.toHaveBeenCalled();
  });

  it.each(["inválido", ""])("responde 404 para el ID %j sin consultar", async (idInvalido) => {
    await expect(VehiculoDetallePage({ params: Promise.resolve({ id: idInvalido }) })).rejects.toBe(noEncontrado);
    expect(deps.obtener).not.toHaveBeenCalled();
  });

  it("responde 404 si el vehículo no existe", async () => {
    deps.obtener.mockResolvedValue(null);
    await expect(VehiculoDetallePage({ params: Promise.resolve({ id }) })).rejects.toBe(noEncontrado);
    expect(deps.obtener).toHaveBeenCalledWith(id);
  });
});

describe("estados y navegación de Vehículos", () => {
  it("respeta la redirección de autenticación antes de consultar ambas páginas", async () => {
    deps.autorizar.mockRejectedValue(redireccion);
    await expect(VehiculosPage({ searchParams: Promise.resolve({}) })).rejects.toBe(redireccion);
    await expect(VehiculoDetallePage({ params: Promise.resolve({ id }) })).rejects.toBe(redireccion);
    expect(deps.listar).not.toHaveBeenCalled();
    expect(deps.obtener).not.toHaveBeenCalled();
  });

  it("propaga fallas de consulta a los límites de error", async () => {
    const error = new Error("error de persistencia");
    deps.listar.mockRejectedValue(error);
    deps.obtener.mockRejectedValue(error);
    await expect(VehiculosPage({ searchParams: Promise.resolve({}) })).rejects.toBe(error);
    await expect(VehiculoDetallePage({ params: Promise.resolve({ id }) })).rejects.toBe(error);
  });

  it("presenta carga accesible y errores sin detalles técnicos", () => {
    expect(html(<LoadingVehiculos />)).toContain('role="status"');
    expect(html(<LoadingVehiculos />)).toContain("Cargando vehículos");
    expect(html(<LoadingVehiculoDetalle />)).toContain("Cargando detalle del vehículo");
    for (const Componente of [VehiculosError, VehiculoDetalleError]) {
      const pagina = html(<Componente error={new Error("secreto-simulado")} reset={vi.fn()} />);
      expect(pagina).toContain('role="alert"');
      expect(pagina).toContain("Reintentar");
      expect(pagina).not.toContain("secreto-simulado");
    }
  });

  it.each([
    ["RECEPCIONISTA", true], ["ENCARGADO_DEL_TALLER", true],
    ["MECANICO", false], ["ADMINISTRADOR", false],
  ])("enlace de navegación para %s", async (rol, permitido) => {
    deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const pagina = html(await AppLayout({ children: <p>Contenido</p> }));
    expect(pagina.includes('href="/vehiculos"')).toBe(permitido);
  });
});
