import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Prisma, type RolUsuario } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({ autorizar: vi.fn(), siniestro: vi.fn(), presupuesto: vi.fn(), listar: vi.fn(), reparaciones: vi.fn(), repuestos: vi.fn(), notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: d.autorizar }));
vi.mock("@/lib/db/siniestro", () => ({ obtenerSiniestroPorId: d.siniestro }));
vi.mock("@/lib/db/presupuesto", () => ({ obtenerPresupuestoPorId: d.presupuesto, listarPresupuestosPorSiniestro: d.listar }));
vi.mock("@/lib/db/reparacion", () => ({ listarReparaciones: d.reparaciones }));
vi.mock("@/lib/db/repuesto", () => ({ listarRepuestos: d.repuestos }));
vi.mock("next/navigation", () => ({ notFound: d.notFound, redirect: d.redirect }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@/components/layout/ContenedorPagina", () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
vi.mock("@/components/presupuestos/ContextoSiniestroPresupuesto", () => ({ default: () => React.createElement("p", {}, "Contexto del siniestro") }));
vi.mock("@/components/presupuestos/GestionEstadoPresupuesto", () => ({ default: (props: { presupuestoId: string; estado: string }) => React.createElement("section", { "data-presupuesto": props.presupuestoId, "data-estado": props.estado }, "Controles de estado") }));
vi.mock("@/components/presupuestos/FormularioPresupuesto", () => ({ default: (props: { inicial?: { reparaciones: Array<{ costo: string }> }; siniestroId: string }) => React.createElement("form", { "data-siniestro": props.siniestroId }, JSON.stringify(props.inicial)) }));
vi.mock("@/lib/schemas/presupuesto", async () => import("../../lib/schemas/presupuesto"));
vi.mock("@/lib/schemas/ordenTrabajo", async () => import("../../lib/schemas/ordenTrabajo"));
vi.mock("@/lib/schemas/siniestro", async () => import("../../lib/schemas/siniestro"));
vi.mock("@/lib/services/presupuesto", async () => import("../../lib/services/presupuesto"));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));

import CrearPage from "../../app/(app)/siniestros/[id]/presupuestos/nuevo/page";
import DetallePage from "../../app/(app)/presupuestos/[id]/page";
import EditarPage from "../../app/(app)/presupuestos/[id]/editar/page";
import PresupuestosSiniestro from "./PresupuestosSiniestro";

const id = "10000000-0000-4000-8000-000000000001";
const siniestroId = "20000000-0000-4000-8000-000000000002";
const presupuesto = {
  id, numeroPresupuesto: "P-1", estado: "BORRADOR", siniestro: { id: siniestroId, numeroSiniestro: "SIN-1" },
  reparaciones: [{ id: "detalle", costo: new Prisma.Decimal("0.10"), reparacion: { id: "reparacion", nombre: "Pintura" } }],
  repuestos: [{ id: "detalle-repuesto", cantidad: 2, repuesto: { id: "repuesto", nombre: "Óptica" } }],
};
const interrupcion404 = new Error("404_SIMULADO");
const interrupcionRedirect = new Error("REDIRECT_SIMULADO");
let rol: RolUsuario;

beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("React", React); rol = "ENCARGADO_DEL_TALLER";
  d.autorizar.mockImplementation(async (roles: string[]) => roles.includes(rol) ? { autorizado: true, usuario: { id: "usuario", rol } } : { autorizado: false });
  d.siniestro.mockResolvedValue({ id: siniestroId });
  d.presupuesto.mockResolvedValue(presupuesto);
  d.reparaciones.mockResolvedValue({ opciones: [], total: 0 }); d.repuestos.mockResolvedValue({ opciones: [], total: 0 });
  d.listar.mockResolvedValue({ presupuestos: [presupuesto], total: 11 });
  d.notFound.mockImplementation(() => { throw interrupcion404; }); d.redirect.mockImplementation(() => { throw interrupcionRedirect; });
});

describe("páginas de presupuestos", () => {
  it.each(["ENCARGADO_DEL_TALLER", "RECEPCIONISTA", "MECANICO", "ADMINISTRADOR"] satisfies RolUsuario[])("autoriza las tres páginas para el rol %s antes de consultar", async (valor) => {
    rol = valor;
    const htmlCrear = renderToStaticMarkup(await CrearPage({ params: Promise.resolve({ id: siniestroId }) }));
    const htmlEditar = renderToStaticMarkup(await EditarPage({ params: Promise.resolve({ id }) }));
    const htmlDetalle = renderToStaticMarkup(await DetallePage({ params: Promise.resolve({ id }) }));
    if (rol === "ENCARGADO_DEL_TALLER") {
      expect(htmlCrear).toContain("<form"); expect(htmlEditar).toContain("<form"); expect(htmlDetalle).toContain("Editar borrador");
      expect(d.autorizar.mock.invocationCallOrder[0]).toBeLessThan(d.siniestro.mock.invocationCallOrder[0]!);
    } else {
      expect(htmlCrear).toContain("Acceso denegado"); expect(htmlEditar).toContain("Acceso denegado");
      expect(d.siniestro).not.toHaveBeenCalled(); expect(d.reparaciones).not.toHaveBeenCalled(); expect(d.repuestos).not.toHaveBeenCalled();
      if (rol === "RECEPCIONISTA") { expect(htmlDetalle).toContain("P-1"); expect(htmlDetalle).not.toContain("Editar borrador"); }
      else { expect(htmlDetalle).toContain("Acceso denegado"); expect(htmlDetalle).not.toContain("Controles de estado"); expect(d.presupuesto).not.toHaveBeenCalled(); }
    }
  });
  it("propaga la redirección de sesión antes de consultar", async () => {
    d.autorizar.mockRejectedValue(interrupcionRedirect);
    await expect(CrearPage({ params: Promise.resolve({ id: siniestroId }) })).rejects.toBe(interrupcionRedirect);
    await expect(EditarPage({ params: Promise.resolve({ id }) })).rejects.toBe(interrupcionRedirect);
    await expect(DetallePage({ params: Promise.resolve({ id }) })).rejects.toBe(interrupcionRedirect);
    expect(d.siniestro).not.toHaveBeenCalled(); expect(d.presupuesto).not.toHaveBeenCalled();
  });
  it.each([CrearPage, EditarPage, DetallePage])("resuelve UUID inválido como 404 sin consultas", async (pagina) => {
    await expect(pagina({ params: Promise.resolve({ id: "invalido" }) })).rejects.toBe(interrupcion404);
    expect(d.siniestro).not.toHaveBeenCalled(); expect(d.presupuesto).not.toHaveBeenCalled();
  });
  it("maneja siniestro inexistente sin consultar catálogos", async () => {
    d.siniestro.mockResolvedValue(null);
    await expect(CrearPage({ params: Promise.resolve({ id: siniestroId }) })).rejects.toBe(interrupcion404);
    expect(d.reparaciones).not.toHaveBeenCalled();
  });
  it.each([EditarPage, DetallePage])("resuelve presupuesto inexistente como 404", async (pagina) => {
    d.presupuesto.mockResolvedValue(null);
    await expect(pagina({ params: Promise.resolve({ id }) })).rejects.toBe(interrupcion404);
    expect(d.reparaciones).not.toHaveBeenCalled();
  });
  it("precarga el borrador con costos serializables exactos", async () => {
    const html = renderToStaticMarkup(await EditarPage({ params: Promise.resolve({ id }) }));
    expect(html).toContain("0.10"); expect(html).toContain(siniestroId);
    expect(d.reparaciones).toHaveBeenCalledWith(1, 10); expect(d.repuestos).toHaveBeenCalledWith(1, 10);
  });
  it.each(["ENVIADO", "APROBADO", "RECHAZADO"])("presenta consulta y bloquea edición de %s", async (estado) => {
    d.presupuesto.mockResolvedValue({ ...presupuesto, estado });
    const detalle = renderToStaticMarkup(await DetallePage({ params: Promise.resolve({ id }) }));
    const editar = renderToStaticMarkup(await EditarPage({ params: Promise.resolve({ id }) }));
    expect(detalle).not.toContain("Editar borrador"); expect(detalle).toContain(estado);
    expect(editar).toContain("Presupuesto no editable"); expect(editar).not.toContain("<form");
    expect(d.reparaciones).not.toHaveBeenCalled();
  });
  it("muestra el total y permite consultar un presupuesto sin repuestos", async () => {
    d.presupuesto.mockResolvedValue({ ...presupuesto, repuestos: [] });
    const html = renderToStaticMarkup(await DetallePage({ params: Promise.resolve({ id }) }));
    expect(html).toContain("Sin repuestos."); expect(html).toContain("Total de reparaciones: 0.10");
  });
  it("actualiza el estado consultado y la posibilidad de edición al volver a renderizar el detalle", async () => {
    const antes = renderToStaticMarkup(await DetallePage({ params: Promise.resolve({ id }) }));
    expect(antes).toContain('data-estado="BORRADOR"'); expect(antes).toContain("Editar borrador");
    for (const estado of ["ENVIADO", "APROBADO", "RECHAZADO"]) {
      d.presupuesto.mockResolvedValue({ ...presupuesto, estado });
      const despues = renderToStaticMarkup(await DetallePage({ params: Promise.resolve({ id }) }));
      expect(despues).toContain(`data-estado="${estado}"`);
      expect(despues).toContain(`data-presupuesto="${id}"`);
      expect(despues).not.toContain("Editar borrador");
    }
  });
});

describe("presupuestos del siniestro", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"] satisfies RolUsuario[])("muestra acceso al alta según rol %s", async (valor) => {
    const html = renderToStaticMarkup(await PresupuestosSiniestro({ siniestroId, rol: valor, paginaParametro: undefined }));
    expect(html.includes("Crear presupuesto")).toBe(valor === "ENCARGADO_DEL_TALLER");
    expect(html).toContain(`/presupuestos/${id}`); expect(html).toContain("presupuestosPage=2");
    expect(html).toContain("Página 1 de 2"); expect(html).not.toContain('>Anterior</a>');
  });
  it("muestra la última página de once registros y sus límites", async () => {
    const html = renderToStaticMarkup(await PresupuestosSiniestro({ siniestroId, rol, paginaParametro: "2" }));
    expect(d.listar).toHaveBeenCalledWith(siniestroId, 2, 10);
    expect(html).toContain("Página 2 de 2"); expect(html).toContain('>Anterior</a>'); expect(html).not.toContain('>Siguiente</a>');
  });
  it.each(["0", "-1", "abc", ["1", "2"], "1e100", String(Number.MAX_SAFE_INTEGER + 1), String(Number.MAX_SAFE_INTEGER)])("redirige página inválida o repetida %s antes de consultar", async (paginaParametro) => {
    await expect(PresupuestosSiniestro({ siniestroId, rol, paginaParametro })).rejects.toBe(interrupcionRedirect);
    expect(d.redirect).toHaveBeenCalledWith(`/siniestros/${siniestroId}`); expect(d.listar).not.toHaveBeenCalled();
  });
  it("redirige páginas superiores al total", async () => {
    await expect(PresupuestosSiniestro({ siniestroId, rol, paginaParametro: "99" })).rejects.toBe(interrupcionRedirect);
    expect(d.redirect).toHaveBeenCalledWith(`/siniestros/${siniestroId}?presupuestosPage=2`);
  });
  it("presenta el estado vacío", async () => {
    d.listar.mockResolvedValue({ presupuestos: [], total: 0 });
    const html = renderToStaticMarkup(await PresupuestosSiniestro({ siniestroId, rol, paginaParametro: undefined }));
    expect(html).toContain("No hay presupuestos asociados"); expect(html).not.toContain("Página 1");
  });
});
