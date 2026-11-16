import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  autorizar: vi.fn(),
  listarLocalidades: vi.fn(),
}));

vi.mock("@/lib/authPagina", () => ({
  autorizarPagina: dependencias.autorizar,
}));
vi.mock("@/lib/db/localidad", () => ({
  listarLocalidades: dependencias.listarLocalidades,
}));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("@/components/layout/ContenedorPagina", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));
vi.mock("@/components/clientes/FormularioCliente", () => ({
  default: ({ localidadesIniciales }: { localidadesIniciales: unknown }) =>
    React.createElement(
      "div",
      { "data-formulario": "cliente" },
      JSON.stringify(localidadesIniciales),
    ),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    React.createElement("a", props, children),
}));

import ClienteNuevoPage from "./page";

const localidades = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    nombre: "San Martín",
    provincia: { id: "provincia-1", nombre: "Buenos Aires" },
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    nombre: "San Martín",
    provincia: { id: "provincia-2", nombre: "Mendoza" },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  dependencias.autorizar.mockResolvedValue({
    autorizado: true,
    usuario: { id: "usuario", rol: "RECEPCIONISTA" },
  });
  dependencias.listarLocalidades.mockResolvedValue({
    localidades,
    total: 12,
  });
});

describe("página de alta de Clientes", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "autoriza, carga la primera página y muestra el formulario para %s",
    async (rol) => {
      dependencias.autorizar.mockResolvedValue({
        autorizado: true,
        usuario: { id: "usuario", rol },
      });

      const pagina = renderToStaticMarkup(await ClienteNuevoPage());

      expect(pagina).toContain("Registrar cliente");
      expect(pagina).toContain('href="/clientes"');
      expect(pagina).toContain('data-formulario="cliente"');
      expect(pagina).toContain("San Martín");
      expect(pagina).toContain("Buenos Aires");
      expect(pagina).toContain("Mendoza");
      expect(dependencias.autorizar).toHaveBeenCalledWith([
        "RECEPCIONISTA",
        "ENCARGADO_DEL_TALLER",
      ]);
      expect(dependencias.listarLocalidades).toHaveBeenCalledExactlyOnceWith(
        1,
        10,
      );
    },
  );

  it.each(["MECANICO", "ADMINISTRADOR"])(
    "deniega a %s antes de consultar Localidades",
    async (rol) => {
      dependencias.autorizar.mockResolvedValue({
        autorizado: false,
        usuario: { rol },
      });

      const pagina = renderToStaticMarkup(await ClienteNuevoPage());

      expect(pagina).toContain("Acceso denegado");
      expect(pagina).not.toContain('data-formulario="cliente"');
      expect(dependencias.listarLocalidades).not.toHaveBeenCalled();
    },
  );
});
