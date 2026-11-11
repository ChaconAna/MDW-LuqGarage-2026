import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({ autorizar: vi.fn(), listar: vi.fn() }));

vi.mock("@/lib/authPagina", () => ({ autorizarPagina: dependencias.autorizar }));
vi.mock("@/lib/db/siniestro", () => ({ listarSiniestros: dependencias.listar }));
vi.mock("@/lib/schemas/siniestro", async () => import("../../../lib/schemas/siniestro"));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@/components/layout/ContenedorPagina", () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
vi.mock("@/components/siniestros/TablaSiniestros", () => ({ default: () => React.createElement("div", {}, "Tabla de siniestros") }));

import SiniestrosPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  dependencias.listar.mockResolvedValue({ siniestros: [], total: 0 });
});

describe("acceso al registro desde el listado de siniestros", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])("muestra un enlace navegable para %s incluso sin registros", async (rol) => {
    dependencias.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
    const html = renderToStaticMarkup(await SiniestrosPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('<a href="/siniestros/nuevo"');
    expect(html).toContain("Registrar siniestro");
    expect(dependencias.autorizar).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    expect(dependencias.listar).toHaveBeenCalledExactlyOnceWith(1, 10);
  });

  it.each(["MECANICO", "ADMINISTRADOR"])("no muestra el enlace ni consulta siniestros para %s", async (rol) => {
    dependencias.autorizar.mockResolvedValue({ autorizado: false, usuario: { rol } });
    const html = renderToStaticMarkup(await SiniestrosPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Acceso denegado");
    expect(html).not.toContain("/siniestros/nuevo");
    expect(dependencias.listar).not.toHaveBeenCalled();
  });
});
