import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  autorizar: vi.fn(), obtener: vi.fn(), localidades: vi.fn(), actualizar: vi.fn(), formulario: vi.fn(),
}));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: dependencias.autorizar }));
vi.mock("@/lib/db/cliente", () => ({ obtenerClientePorId: dependencias.obtener }));
vi.mock("@/lib/db/localidad", () => ({ listarLocalidades: dependencias.localidades }));
vi.mock("@/lib/schemas/cliente", async () => import("../../../../../lib/schemas/cliente"));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("./actions", () => ({ actualizarClienteAction: dependencias.actualizar }));
vi.mock("@/components/layout/ContenedorPagina", () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children),
}));
vi.mock("@/components/clientes/FormularioCliente", () => ({ default: dependencias.formulario }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import ClienteEditarPage from "./page";

const cliente = {
  id: "10000000-0000-4000-8000-000000000001",
  nombre: "Ana", apellido: "Pérez", dni: "30111222", telefono: "1155550101",
  email: "ana@ejemplo.test", direccion: "Calle 123", activo: false,
  localidad: {
    id: "20000000-0000-4000-8000-000000000002", nombre: "San Martín",
    provincia: { id: "30000000-0000-4000-8000-000000000003", nombre: "Buenos Aires" },
  },
};
const params = () => Promise.resolve({ id: cliente.id });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  dependencias.autorizar.mockResolvedValue({ autorizado: true });
  dependencias.obtener.mockResolvedValue(cliente);
  dependencias.localidades.mockResolvedValue({ localidades: [], total: 0 });
  dependencias.formulario.mockReturnValue(React.createElement("form"));
});

describe("edición de Cliente", () => {
  it.each([true, false])("precarga un cliente activo=%s, incluida su Localidad fuera del catálogo inicial", async (activo) => {
    dependencias.obtener.mockResolvedValue({ ...cliente, activo });
    const pagina = renderToStaticMarkup(await ClienteEditarPage({ params: params() }));
    expect(pagina).toContain("Editar cliente");
    expect(pagina).toContain(`href="/clientes/${cliente.id}"`);
    expect(dependencias.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(dependencias.obtener).toHaveBeenCalledWith(cliente.id);
    expect(dependencias.localidades).toHaveBeenCalledWith(1, 10);
    const props = dependencias.formulario.mock.calls[0]![0] as React.ComponentProps<
      typeof import("@/components/clientes/FormularioCliente").default
    >;
    expect(props.datosIniciales).toEqual({
      nombre: cliente.nombre, apellido: cliente.apellido, dni: cliente.dni,
      telefono: cliente.telefono, email: cliente.email, direccion: cliente.direccion,
    });
    expect(props.localidadInicial).toEqual(cliente.localidad);
    expect(props.hrefCancelar).toBe(`/clientes/${cliente.id}`);
    expect(dependencias.actualizar).not.toHaveBeenCalled();
    await props.guardarAction!({ errores: {} }, { nombre: "Nuevo nombre" });
    expect(dependencias.actualizar).toHaveBeenCalledWith(cliente.id, { errores: {} }, { nombre: "Nuevo nombre" });
  });

  it("deniega acceso antes de consultar datos", async () => {
    dependencias.autorizar.mockResolvedValue({ autorizado: false });
    const pagina = renderToStaticMarkup(await ClienteEditarPage({ params: params() }));
    expect(pagina).toContain("Acceso denegado");
    expect(dependencias.obtener).not.toHaveBeenCalled();
    expect(dependencias.localidades).not.toHaveBeenCalled();
    expect(dependencias.formulario).not.toHaveBeenCalled();
  });

  it("responde 404 ante un ID inválido sin consultar", async () => {
    await expect(ClienteEditarPage({ params: Promise.resolve({ id: "invalido" }) })).rejects.toThrow("NOT_FOUND");
    expect(dependencias.obtener).not.toHaveBeenCalled();
  });

  it("responde 404 ante un cliente inexistente", async () => {
    dependencias.obtener.mockResolvedValue(null);
    await expect(ClienteEditarPage({ params: params() })).rejects.toThrow("NOT_FOUND");
    expect(dependencias.localidades).not.toHaveBeenCalled();
  });
});
