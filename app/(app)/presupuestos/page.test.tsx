import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { RolUsuario } from "@prisma/client";
import { chromium, expect as esperar, type Browser, type Page } from "@playwright/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn(), usuario: vi.fn(), listar: vi.fn(), redirect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: deps.auth }));
vi.mock("@/lib/db/usuario", () => ({ obtenerUsuarioParaAutorizacionPorId: deps.usuario }));
vi.mock("@/lib/authPagina", async () => import("../../../lib/authPagina"));
vi.mock("@/lib/db/presupuesto", () => ({ listarPresupuestos: deps.listar }));
vi.mock("@/lib/schemas/presupuesto", async () => import("../../../lib/schemas/presupuesto"));
vi.mock("@/lib/utils", async () => import("../../../lib/utils"));
vi.mock("@/components/layout/ContenedorPagina", async () => import("../../../components/layout/ContenedorPagina"));
vi.mock("@/components/presupuestos/TablaPresupuestos", async () => import("../../../components/presupuestos/TablaPresupuestos"));
vi.mock("@/components/ui/button", async () => import("../../../components/ui/button"));
vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
vi.mock("next/link", () => ({
  default: ({ prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return React.createElement("a", props);
  },
}));

import PresupuestosPage from "./page";

const redireccion = new Error("NEXT_REDIRECT");
const usuarioId = "90000000-0000-4000-8000-000000000001";
const estados = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO"] as const;
const presupuestos = Array.from({ length: 11 }, (_, indice) => ({
  id: `10000000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
  numeroPresupuesto: `PRE-${String(indice + 1).padStart(3, "0")}`,
  estado: estados[indice % estados.length]!,
  siniestro: {
    id: `20000000-0000-4000-8000-${String(indice % 2 + 1).padStart(12, "0")}`,
    numeroSiniestro: `SIN-${indice % 2 + 1}`,
  },
})) satisfies Awaited<ReturnType<typeof import("../../../lib/db/presupuesto").listarPresupuestos>>["presupuestos"];

function prepararRol(rol: RolUsuario) {
  deps.usuario.mockResolvedValue({ id: usuarioId, activo: true, rol });
}

async function renderizar(searchParams: Record<string, string | string[] | undefined> = {}) {
  return renderToStaticMarkup(await PresupuestosPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  deps.auth.mockResolvedValue({ user: { usuarioId } });
  prepararRol("RECEPCIONISTA");
  deps.listar.mockResolvedValue({ presupuestos: presupuestos.slice(0, 10), total: 11 });
  deps.redirect.mockImplementation(() => { throw redireccion; });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("consulta global de presupuestos", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"] as const)("permite consultar a %s con la autorización existente", async (rol) => {
    prepararRol(rol);
    const html = await renderizar();
    expect(html).toContain("<h1");
    expect(html).toContain(">Presupuestos</h1>");
    expect(html).toContain("Consultá los presupuestos registrados");
    expect(deps.listar).toHaveBeenCalledExactlyOnceWith(1, 10);
    expect(deps.usuario.mock.invocationCallOrder[0]!).toBeLessThan(deps.listar.mock.invocationCallOrder[0]!);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("/nuevo");
    expect(html).not.toContain("/editar");
  });

  it.each(["MECANICO", "ADMINISTRADOR"] as const)("deniega a %s sin consultar presupuestos ni procesar la paginación", async (rol) => {
    prepararRol(rol);
    const html = await renderizar({ page: "inválida", rol: "ENCARGADO_DEL_TALLER" });
    expect(html).toContain("Acceso denegado");
    expect(html).not.toContain("<table");
    expect(deps.listar).not.toHaveBeenCalled();
    expect(deps.redirect).not.toHaveBeenCalled();
  });

  it("redirige al login sin consultar datos cuando no hay sesión", async () => {
    deps.auth.mockResolvedValue(null);
    await expect(renderizar()).rejects.toBe(redireccion);
    expect(deps.redirect).toHaveBeenCalledExactlyOnceWith("/login");
    expect(deps.usuario).not.toHaveBeenCalled();
    expect(deps.listar).not.toHaveBeenCalled();
  });

  it("muestra las tres columnas, los cuatro estados y enlaces con los identificadores correspondientes", async () => {
    const html = await renderizar();
    expect([...html.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((match) => match[1]))
      .toEqual(["Presupuesto", "Estado", "Siniestro"]);
    for (const etiqueta of ["Borrador", "Enviado", "Aprobado", "Rechazado"]) expect(html).toContain(`>${etiqueta}</td>`);
    for (const presupuesto of presupuestos.slice(0, 10)) {
      expect(html).toContain(`href="/presupuestos/${presupuesto.id}"`);
      expect(html).toContain(`>${presupuesto.numeroPresupuesto}</a>`);
      expect(html).toContain(`href="/siniestros/${presupuesto.siniestro.id}"`);
      expect(html).toContain(`>${presupuesto.siniestro.numeroSiniestro}</a>`);
    }
    expect(html).toContain("Mostrando 10 de 11 presupuestos registrados.");
    expect(html).toContain('aria-label="Paginación de presupuestos"');
    expect(html).toContain('<span class="text-sm">Página 1 de 2</span>');
    expect(html).not.toContain("aria-current");
  });

  it("mantiene diez registros por página, los contadores y los extremos de la paginación", async () => {
    deps.listar.mockResolvedValueOnce({ presupuestos: presupuestos.slice(0, 10), total: 11 })
      .mockResolvedValueOnce({ presupuestos: presupuestos.slice(10), total: 11 });
    const primera = await renderizar({ limit: "100" });
    const ultima = await renderizar({ page: "2", limit: "1" });
    expect(deps.listar).toHaveBeenNthCalledWith(1, 1, 10);
    expect(deps.listar).toHaveBeenNthCalledWith(2, 2, 10);
    for (const [indice, presupuesto] of presupuestos.entries()) {
      expect(primera.includes(presupuesto.numeroPresupuesto)).toBe(indice < 10);
      expect(ultima.includes(presupuesto.numeroPresupuesto)).toBe(indice === 10);
    }
    expect(primera).toContain('href="/presupuestos?page=2"');
    expect(primera).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Página anterior no disponible"/);
    expect(primera).toContain("Página 1 de 2");
    expect(ultima).toContain('href="/presupuestos"');
    expect(ultima).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Página siguiente no disponible"/);
    expect(ultima).toContain("Página 2 de 2");
    expect(ultima).toContain("Mostrando 1 de 11 presupuestos registrados.");
  });

  it("habilita ambos controles en una página intermedia", async () => {
    deps.listar.mockResolvedValue({ presupuestos: presupuestos.slice(0, 10), total: 30 });
    const html = await renderizar({ page: "2" });
    expect(html).toContain('href="/presupuestos"');
    expect(html).toContain('href="/presupuestos?page=3"');
    expect(html).not.toContain("no disponible");
    expect(html).toContain("Página 2 de 3");
  });

  it.each(["0", "-1", "abc", "1.5", "", "Infinity", "1e100", String(Number.MAX_SAFE_INTEGER), String(Number.MAX_SAFE_INTEGER + 1), ["1"], ["1", "2"]])(
    "redirige el parámetro inválido %j antes de consultar", async (page) => {
      await expect(renderizar({ page })).rejects.toBe(redireccion);
      expect(deps.redirect).toHaveBeenCalledExactlyOnceWith("/presupuestos");
      expect(deps.listar).not.toHaveBeenCalled();
    },
  );

  it.each([
    { total: 11, destino: "/presupuestos?page=2" },
    { total: 10, destino: "/presupuestos" },
    { total: 0, destino: "/presupuestos" },
  ])("redirige una página fuera de rango con $total registros a $destino", async ({ total, destino }) => {
    deps.listar.mockResolvedValue({ presupuestos: [], total });
    await expect(renderizar({ page: "99" })).rejects.toBe(redireccion);
    expect(deps.listar).toHaveBeenCalledExactlyOnceWith(99, 10);
    expect(deps.redirect).toHaveBeenCalledExactlyOnceWith(destino);
  });

  it("presenta el listado vacío sin tabla ni paginación", async () => {
    deps.listar.mockResolvedValue({ presupuestos: [], total: 0 });
    const html = await renderizar();
    expect(html).toContain("No hay presupuestos registrados.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Paginación de presupuestos");
    expect(deps.redirect).not.toHaveBeenCalled();
  });

  it("propaga fallas de consulta al límite de error existente", async () => {
    const error = new Error("Falla de consulta simulada");
    deps.listar.mockRejectedValue(error);
    await expect(renderizar()).rejects.toBe(error);
  });
});

const navegador = [process.env.CHROME_PATH, chromium.executablePath(),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((ruta): ruta is string => Boolean(ruta && existsSync(ruta)));

// Componentes y CSS reales; sesión y datos simulados. Requiere npm run build previo.
describe.skipIf(!navegador)("listado de presupuestos adaptable en navegador", () => {
  let browser: Browser;
  let page: Page;
  let css: string;

  beforeAll(async () => {
    const carpeta = path.resolve(".next/static/css");
    const archivos = existsSync(carpeta) ? readdirSync(carpeta).filter((archivo) => archivo.endsWith(".css")) : [];
    expect(archivos.length, "Ejecutar npm run build antes de estas pruebas").toBeGreaterThan(0);
    css = archivos.map((archivo) => readFileSync(path.join(carpeta, archivo), "utf8")).join("\n");
    browser = await chromium.launch({ executablePath: navegador, headless: true });
  }, 30000);
  beforeEach(async () => { page = await browser.newPage(); });
  afterEach(async () => { await page?.close(); });
  afterAll(async () => { await browser?.close(); });

  it.each([320, 375, 768, 1024, 1440])("conserva la tabla, el foco y el contenido sin desbordamientos a %i px", async (ancho) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const numerosLargos of [false, true]) {
      deps.listar.mockResolvedValue({
        presupuestos: presupuestos.slice(0, 10).map((presupuesto) => ({
          ...presupuesto,
          numeroPresupuesto: numerosLargos ? "P".repeat(100) : presupuesto.numeroPresupuesto,
          siniestro: { ...presupuesto.siniestro, numeroSiniestro: numerosLargos ? "S".repeat(100) : presupuesto.siniestro.numeroSiniestro },
        })),
        total: 11,
      });
      await page.setContent(`<!doctype html><html lang="es" class="dark"><head><meta charset="utf-8"><style>${css}</style></head><body>${await renderizar()}</body></html>`);
      await esperar(page.getByRole("columnheader")).toHaveCount(3);
      expect(await page.getByRole("columnheader").evaluateAll((encabezados) => encabezados.every((encabezado) => {
        const texto = document.createRange();
        texto.selectNodeContents(encabezado);
        return texto.getBoundingClientRect().height <= parseFloat(getComputedStyle(encabezado).lineHeight);
      }))).toBe(true);
      await esperar(page.getByRole("row")).toHaveCount(11);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator("table, th, td").evaluateAll((elementos) => elementos.every((elemento) => elemento.scrollWidth <= elemento.clientWidth + 1))).toBe(true);
      for (const control of await page.locator("a, button").all()) {
        const caja = (await control.boundingBox())!;
        expect(caja.x).toBeGreaterThanOrEqual(0);
        expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
      }
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      const enlaces = await page.locator("a").all();
      for (const enlace of enlaces) {
        await page.keyboard.press("Tab");
        await esperar(enlace).toBeFocused();
        expect(await enlace.evaluate((elemento) => {
          const estilo = getComputedStyle(elemento);
          return elemento.matches(":focus-visible") && (estilo.outlineStyle !== "none" || estilo.boxShadow !== "none");
        })).toBe(true);
      }
      if (!numerosLargos) {
        mkdirSync("test-results", { recursive: true });
        await page.screenshot({ path: `test-results/presupuestos-${ancho}.png`, fullPage: true });
      }
    }
  }, 30000);
});
