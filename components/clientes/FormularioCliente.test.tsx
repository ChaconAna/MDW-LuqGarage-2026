import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/clientes/nuevo/actions", () => ({
  crearClienteAction: vi.fn(async () => ({ errores: {} })),
  consultarLocalidadesAction: vi.fn(async () => ({
    ok: true,
    localidades: [],
    total: 0,
    pagina: 1,
    busqueda: "",
  })),
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) =>
    React.createElement("input", props),
}));
vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button"> & {
    asChild?: boolean;
    variant?: string;
  }) => {
    const { asChild, variant, children, ...buttonProps } = props;
    void variant;
    return asChild
      ? React.createElement(React.Fragment, {}, children)
      : React.createElement("button", buttonProps, children);
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    React.createElement("a", props, children),
}));

import FormularioCliente from "./FormularioCliente";

beforeEach(() => {
  vi.stubGlobal("React", React);
});

describe("FormularioCliente", () => {
  it("presenta campos obligatorios, Localidad con Provincia y cancelación", () => {
    const pagina = renderToStaticMarkup(
      <FormularioCliente
        localidadesIniciales={{
          localidades: [
            {
              id: "10000000-0000-4000-8000-000000000001",
              nombre: "San Martín",
              provincia: {
                id: "20000000-0000-4000-8000-000000000002",
                nombre: "Buenos Aires",
              },
            },
          ],
          total: 11,
          pagina: 1,
          busqueda: "",
        }}
      />,
    );

    for (const etiqueta of [
      "Nombre",
      "Apellido",
      "DNI",
      "Teléfono",
      "Email",
      "Dirección",
    ]) {
      expect(pagina).toContain(`${etiqueta} (obligatorio)`);
    }
    expect(pagina).toContain("San Martín — Buenos Aires");
    expect(pagina).toContain("Página 1 de 2");
    expect(pagina).toContain("Buscar por Localidad o Provincia");
    expect(pagina).toContain("Guardar cliente");
    expect(pagina).toContain('href="/clientes"');
    expect(pagina).toContain("Cancelar");
    expect(pagina.match(/required=""/g)).toHaveLength(7);
    expect(pagina).not.toContain("provinciaId");
  });
});
