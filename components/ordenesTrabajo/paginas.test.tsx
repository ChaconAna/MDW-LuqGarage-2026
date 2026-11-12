import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({ auth: vi.fn(), usuario: vi.fn(), listar: vi.fn(), finalizadas: vi.fn(), detalle: vi.fn(), finalizada: vi.fn(), siniestro: vi.fn(), disponibles: vi.fn(), porSiniestro: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: d.auth, signOut: vi.fn() }));
vi.mock("@/lib/db/usuario", () => ({ obtenerUsuarioParaAutorizacionPorId: d.usuario }));
vi.mock("@/lib/authPagina", async () => import("../../lib/authPagina"));
vi.mock("@/lib/db/siniestro", () => ({ obtenerSiniestroPorId: d.siniestro }));
vi.mock("@/lib/db/presupuesto", () => ({ listarPresupuestosAprobadosDisponibles: d.disponibles }));
vi.mock("@/lib/db/ordenTrabajo", () => ({ listarOrdenesTrabajo: d.listar, listarOrdenesTrabajoFinalizadas: d.finalizadas, obtenerOrdenTrabajoPorId: d.detalle, obtenerOrdenTrabajoFinalizadaPorId: d.finalizada, listarOrdenesTrabajoPorSiniestro: d.porSiniestro }));
vi.mock("@/lib/schemas/ordenTrabajo", async () => import("../../lib/schemas/ordenTrabajo"));
vi.mock("@/lib/schemas/siniestro", async () => import("../../lib/schemas/siniestro"));
vi.mock("@/lib/schemas/presupuesto", async () => import("../../lib/schemas/presupuesto"));
vi.mock("@/lib/services/ordenTrabajo", async () => import("../../lib/services/ordenTrabajo"));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("next/navigation", () => ({ redirect: d.redirect, notFound: d.notFound }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@/components/layout/ContenedorPagina", () => ({ default: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children }: { children: React.ReactNode }) => React.createElement("button", {}, children) }));
vi.mock("@/components/ordenesTrabajo/FormularioOrdenTrabajo", () => ({ default: (props: { siniestroId: string; inicial: unknown }) => React.createElement("form", { "data-siniestro": props.siniestroId }, JSON.stringify(props.inicial)) }));
vi.mock("@/components/ordenesTrabajo/DetalleOrdenTrabajo", async () => import("./DetalleOrdenTrabajo"));
vi.mock("@/components/ordenesTrabajo/ConfeccionOrdenTrabajo", async () => {
  const { default: DetalleOrdenTrabajo } = await import("./DetalleOrdenTrabajo");
  return { default: ({ inicialOrden }: { inicialOrden: Parameters<typeof DetalleOrdenTrabajo>[0]["orden"] }) => React.createElement(DetalleOrdenTrabajo, { orden: inicialOrden, esEncargado: true }, inicialOrden.estado === "BORRADOR" ? "Controles de confección" : null) };
});

import Listado from "../../app/(app)/ordenes-trabajo/page";
import Detalle from "../../app/(app)/ordenes-trabajo/[id]/page";
import Nueva from "../../app/(app)/siniestros/[id]/ordenes-trabajo/nueva/page";
import Layout from "../../app/(app)/layout";
import Asociadas from "./OrdenesTrabajoSiniestro";

const id = "10000000-0000-4000-8000-000000000001";
const presupuestoId = "20000000-0000-4000-8000-000000000001";
const siniestroId = "30000000-0000-4000-8000-000000000001";
const noEncontrado = new Error("404"); const redireccion = new Error("redirect");
const params = () => Promise.resolve({ id });
const detalle = {
  id, estado: "BORRADOR", siniestro: { id: siniestroId, numeroSiniestro: "SIN-1" },
  presupuestos: [1, 2].map((i) => ({ id: i === 1 ? presupuestoId : id, numeroPresupuesto: `P-${i}`, estado: "APROBADO", reparaciones: [{ id: `detalle-${i}`, reparacion: { id: "rep", nombre: "Pintar puerta", sector: { id: "sector", nombre: "Pintura" } } }] })),
  sectores: [{ observacion: "Observación conservada", sector: { id: "sector", nombre: "Pintura" } }],
};
function rol(rol: string, activo = true) { d.usuario.mockResolvedValue({ id: "usuario", rol, activo }); }
const html = renderToStaticMarkup;

beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("React", React);
  d.auth.mockResolvedValue({ user: { usuarioId: "usuario", email: "u@ejemplo.test" } }); rol("ENCARGADO_DEL_TALLER");
  d.listar.mockResolvedValue({ ordenesTrabajo: [detalle], total: 1 });
  d.finalizadas.mockResolvedValue({ ordenesTrabajo: [{ ...detalle, estado: "FINALIZADA" }], total: 1 });
  d.detalle.mockResolvedValue(detalle); d.finalizada.mockResolvedValue({ ...detalle, estado: "FINALIZADA" });
  d.siniestro.mockResolvedValue({ id: siniestroId, numeroSiniestro: "SIN-1" });
  d.disponibles.mockResolvedValue({ presupuestos: [{ id: presupuestoId, numeroPresupuesto: "P-1" }], total: 1 });
  d.porSiniestro.mockResolvedValue({ ordenesTrabajo: [detalle], total: 1 });
  d.notFound.mockImplementation(() => { throw noEncontrado; });
  d.redirect.mockImplementation(() => { throw redireccion; });
});

describe("autorización de páginas y navegación OT", () => {
  it.each(["RECEPCIONISTA", "ADMINISTRADOR"])("deniega %s sin lecturas protegidas", async (r) => {
    rol(r);
    expect(html(await Listado({ searchParams: Promise.resolve({}) }))).toContain("Acceso denegado");
    expect(html(await Detalle({ params: params() }))).toContain("Acceso denegado");
    expect(html(await Nueva({ params: params() }))).toContain("Acceso denegado");
    for (const consulta of [d.listar, d.finalizadas, d.detalle, d.finalizada, d.siniestro, d.disponibles]) expect(consulta).not.toHaveBeenCalled();
  });
  it.each(["sin sesión", "inactivo", "eliminado"])("redirige %s antes de consultar", async (caso) => {
    if (caso === "sin sesión") d.auth.mockResolvedValue(null);
    else if (caso === "inactivo") rol("ENCARGADO_DEL_TALLER", false);
    else d.usuario.mockResolvedValue(null);
    await expect(Listado({ searchParams: Promise.resolve({}) })).rejects.toBe(redireccion);
    await expect(Detalle({ params: params() })).rejects.toBe(redireccion);
    await expect(Nueva({ params: params() })).rejects.toBe(redireccion);
    expect(d.redirect).toHaveBeenCalledWith("/login");
    for (const consulta of [d.listar, d.finalizadas, d.detalle, d.finalizada, d.siniestro, d.disponibles]) expect(consulta).not.toHaveBeenCalled();
  });
  it("Encargado consulta borradores y carga presupuestos después de autorizar", async () => {
    expect(html(await Detalle({ params: params() }))).toContain("BORRADOR");
    const pagina = html(await Nueva({ params: Promise.resolve({ id: siniestroId }) }));
    expect(pagina).toContain(`data-siniestro="${siniestroId}"`);
    expect(d.usuario.mock.invocationCallOrder.at(-1)).toBeLessThan(d.siniestro.mock.invocationCallOrder[0]!);
    expect(d.disponibles).toHaveBeenCalledWith(siniestroId, 1, 10);
    expect(d.siniestro.mock.invocationCallOrder[0]).toBeLessThan(d.disponibles.mock.invocationCallOrder.at(-1)!);
    expect(d.finalizada).not.toHaveBeenCalled();
  });
  it("Mecánico usa listado y conteo restringidos y no ve enlaces prohibidos", async () => {
    rol("MECANICO");
    expect(html(await Listado({ searchParams: Promise.resolve({}) }))).toContain("FINALIZADA");
    const pagina = html(await Detalle({ params: params() }));
    expect(d.listar).not.toHaveBeenCalled(); expect(d.detalle).not.toHaveBeenCalled();
    expect(d.finalizadas).toHaveBeenCalledExactlyOnceWith(1, 10); expect(d.finalizada).toHaveBeenCalledWith(id);
    expect(pagina).not.toContain('href="/siniestros/'); expect(pagina).not.toContain('href="/presupuestos/');
    expect(html(await Nueva({ params: params() }))).toContain("Acceso denegado"); expect(d.siniestro).not.toHaveBeenCalled();
  });
  it("Mecánico recibe 404 por acceso directo a BORRADOR sin recurrir al detalle sin filtro", async () => {
    rol("MECANICO"); d.finalizada.mockResolvedValue(null);
    await expect(Detalle({ params: params() })).rejects.toBe(noEncontrado); expect(d.detalle).not.toHaveBeenCalled();
  });
  it("sólo carga catálogo y controles de confección para el Encargado en BORRADOR", async () => {
    expect(html(await Detalle({ params: params() }))).toContain("Controles de confección");
    expect(d.disponibles).toHaveBeenCalledExactlyOnceWith(siniestroId, 1, 10);
    d.disponibles.mockClear(); d.detalle.mockResolvedValue({ ...detalle, estado: "FINALIZADA" });
    expect(html(await Detalle({ params: params() }))).not.toContain("Controles de confección"); expect(d.disponibles).not.toHaveBeenCalled();
    rol("MECANICO"); expect(html(await Detalle({ params: params() }))).not.toContain("Controles de confección"); expect(d.disponibles).not.toHaveBeenCalled();
  });
  it.each(["ENCARGADO_DEL_TALLER", "MECANICO", "RECEPCIONISTA", "ADMINISTRADOR"])("navegación principal para %s", async (r) => {
    rol(r); const pagina = html(await Layout({ children: <p>Contenido</p> }));
    expect(pagina.includes('href="/ordenes-trabajo"')).toBe(["ENCARGADO_DEL_TALLER", "MECANICO"].includes(r));
    if (r === "MECANICO") expect(pagina).not.toContain('href="/siniestros"');
  });
});

describe("lectura y paginación OT", () => {
  it.each(["inválido", ""])("404 con UUID %s sin lecturas", async (id) => {
    await expect(Detalle({ params: Promise.resolve({ id }) })).rejects.toBe(noEncontrado);
    await expect(Nueva({ params: Promise.resolve({ id }) })).rejects.toBe(noEncontrado);
    expect(d.detalle).not.toHaveBeenCalled(); expect(d.siniestro).not.toHaveBeenCalled();
  });
  it("404 siniestro inexistente antes del catálogo", async () => {
    d.siniestro.mockResolvedValue(null); await expect(Nueva({ params: params() })).rejects.toBe(noEncontrado);
    expect(d.disponibles).not.toHaveBeenCalled();
  });
  it("404 OT inexistente", async () => {
    d.detalle.mockResolvedValue(null); await expect(Detalle({ params: params() })).rejects.toBe(noEncontrado);
  });
  it("muestra observaciones y tareas repetidas con sus dos procedencias", async () => {
    const pagina = html(await Detalle({ params: params() }));
    expect(pagina).toContain("Observación conservada"); expect(pagina.match(/Pintar puerta/g)).toHaveLength(2);
    expect(pagina).toContain("Procedencia: Presupuesto P-1"); expect(pagina).toContain("Procedencia: Presupuesto P-2");
    expect(pagina).not.toContain("<input"); expect(pagina).not.toContain("<textarea");
  });
  it.each(["0", "-1", "abc", "1.5", ["2", "3"], String(Number.MAX_SAFE_INTEGER)])("redirige página inválida %j sin consultar", async (page) => {
    await expect(Listado({ searchParams: Promise.resolve({ page }) })).rejects.toBe(redireccion);
    expect(d.redirect).toHaveBeenCalledWith("/ordenes-trabajo"); expect(d.listar).not.toHaveBeenCalled();
  });
  it("primera y última página de once OT sin duplicados ni omisiones", async () => {
    const todas = Array.from({ length: 11 }, (_, indice) => ({ ...detalle, id: `OT-${indice}` }));
    d.listar.mockImplementation(async (page, limit) => ({ ordenesTrabajo: todas.slice((page - 1) * limit, page * limit), total: 11 }));
    const primera = html(await Listado({ searchParams: Promise.resolve({}) }));
    const ultima = html(await Listado({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(primera).toContain("Página 1 de 2"); expect(ultima).toContain("Página 2 de 2");
    expect(primera).not.toContain('href="/ordenes-trabajo/OT-10"'); expect(ultima).toContain('href="/ordenes-trabajo/OT-10"');
    expect(primera.match(/href="\/ordenes-trabajo\/OT-/g)).toHaveLength(10); expect(ultima.match(/href="\/ordenes-trabajo\/OT-/g)).toHaveLength(1);
    expect(primera).toContain('href="/ordenes-trabajo?page=2"'); expect(ultima).not.toContain('href="/ordenes-trabajo?page=3"');
  });
  it("redirige fuera de rango a última válida", async () => {
    d.listar.mockResolvedValue({ ordenesTrabajo: [], total: 11 });
    await expect(Listado({ searchParams: Promise.resolve({ page: "3" }) })).rejects.toBe(redireccion);
    expect(d.redirect).toHaveBeenCalledWith("/ordenes-trabajo?page=2");
  });
  it("conserva estado vacío sin controles de navegación", async () => {
    d.listar.mockResolvedValue({ ordenesTrabajo: [], total: 0 });
    const pagina = html(await Listado({ searchParams: Promise.resolve({}) })); expect(pagina).toContain("No hay órdenes"); expect(pagina).not.toContain("Siguiente");
  });
  it("asociadas: conserva la página de presupuestos y habilita creación sólo con elegibles", async () => {
    d.porSiniestro.mockResolvedValue({ ordenesTrabajo: [detalle], total: 11 });
    const pagina = html(await Asociadas({ siniestroId, presupuestosPage: "2" }));
    expect(pagina).toContain(`href="/siniestros/${siniestroId}/ordenes-trabajo/nueva"`);
    expect(pagina).toContain("presupuestosPage=2&amp;ordenesPage=2");
    expect(d.porSiniestro).toHaveBeenCalledWith(siniestroId, 1, 10);
    d.disponibles.mockResolvedValue({ presupuestos: [], total: 0 });
    expect(html(await Asociadas({ siniestroId }))).not.toContain("Crear orden de trabajo");
  });
  it("asociadas: corrige inválidos sin perder parámetros independientes", async () => {
    await expect(Asociadas({ siniestroId, paginaParametro: ["1", "2"], presupuestosPage: "2" })).rejects.toBe(redireccion);
    expect(d.redirect).toHaveBeenCalledWith(`/siniestros/${siniestroId}?presupuestosPage=2`); expect(d.porSiniestro).not.toHaveBeenCalled();
  });
});
