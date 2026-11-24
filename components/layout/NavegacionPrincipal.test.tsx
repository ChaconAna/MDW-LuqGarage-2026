import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { chromium, expect as esperar, type Browser, type Page } from "@playwright/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ pathname: vi.fn(), autorizar: vi.fn(), auth: vi.fn(), signOut: vi.fn() }));
vi.mock("@/auth", () => ({ auth: deps.auth, signOut: deps.signOut }));
vi.mock("@/lib/authPagina", () => ({ autorizarPagina: deps.autorizar }));
vi.mock("next/navigation", () => ({ usePathname: deps.pathname }));
vi.mock("next/link", () => ({ default: (props: React.ComponentProps<"a">) => React.createElement("a", props) }));
vi.mock("@/components/ui/button", async () => import("../ui/button"));
vi.mock("@/components/layout/ContenedorPagina", async () => import("./ContenedorPagina"));
vi.mock("@/components/layout/LogoLuqGarage", async () => import("./LogoLuqGarage"));
vi.mock("@/components/layout/NavegacionPrincipal", async () => import("./NavegacionPrincipal"));

import AppLayout from "../../app/(app)/layout";
import NavegacionPrincipal, { type EnlaceNavegacion } from "./NavegacionPrincipal";

const enlaces: EnlaceNavegacion[] = [
  { href: "/siniestros", etiqueta: "Siniestros" },
  { href: "/presupuestos", etiqueta: "Presupuestos" },
  { href: "/clientes", etiqueta: "Clientes" },
  { href: "/vehiculos", etiqueta: "Vehículos" },
  { href: "/ordenes-trabajo", etiqueta: "Órdenes de trabajo" },
  { href: "/sistema", etiqueta: "Sistema" },
];
const roles = ["RECEPCIONISTA", "ENCARGADO_DEL_TALLER", "MECANICO", "ADMINISTRADOR"] as const;
const destinosPorRol = {
  RECEPCIONISTA: ["/siniestros", "/presupuestos", "/clientes", "/vehiculos", "/sistema"],
  ENCARGADO_DEL_TALLER: ["/siniestros", "/presupuestos", "/clientes", "/vehiculos", "/ordenes-trabajo", "/sistema"],
  MECANICO: ["/ordenes-trabajo", "/sistema"],
  ADMINISTRADOR: ["/sistema"],
} as const;
const correo = "usuario.con.un.correo.muy.largo.para.comprobar.el.encabezado@taller.ejemplo.test";

function prepararRol(rol: typeof roles[number]) {
  deps.autorizar.mockResolvedValue({ autorizado: true, usuario: { rol } });
}

async function encabezado() {
  return renderToStaticMarkup(await AppLayout({ children: <main>Contenido de prueba</main> }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  deps.pathname.mockReturnValue("/siniestros");
  deps.auth.mockResolvedValue({ user: { email: correo } });
  prepararRol("ENCARGADO_DEL_TALLER");
});

describe("sección activa de la navegación", () => {
  it.each(enlaces)("marca únicamente $href como página actual", ({ href }) => {
    deps.pathname.mockReturnValue(href);
    const html = renderToStaticMarkup(<NavegacionPrincipal enlaces={enlaces} />);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
    const actual = [...html.matchAll(/<a\b[^>]*>/g)].find(([tag]) => tag.includes(`href="${href}"`))?.[0];
    expect(actual).toContain('aria-current="page"');
    expect(actual).toContain("border-b-link");
  });

  it.each([
    ["/siniestros/nuevo", "/siniestros"],
    ["/siniestros/123", "/siniestros"],
    ["/siniestros/123/presupuestos/nuevo", "/siniestros"],
    ["/siniestros/123/ordenes-trabajo/nueva", "/siniestros"],
    ["/presupuestos/123", "/presupuestos"],
    ["/presupuestos/123/editar", "/presupuestos"],
    ["/clientes/nuevo", "/clientes"],
    ["/clientes/123/editar", "/clientes"],
    ["/vehiculos/nuevo", "/vehiculos"],
    ["/vehiculos/123/editar", "/vehiculos"],
    ["/ordenes-trabajo/123", "/ordenes-trabajo"],
  ])("identifica %s dentro de %s", (ruta, href) => {
    deps.pathname.mockReturnValue(ruta);
    const html = renderToStaticMarkup(<NavegacionPrincipal enlaces={enlaces} />);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
    const actual = [...html.matchAll(/<a\b[^>]*>/g)].find(([tag]) => tag.includes(`href="${href}"`))?.[0];
    expect(actual).toContain('aria-current="location"');
    expect(actual).toContain("border-b-link");
  });

  it.each(["/", "/siniestros-extra", "/clientes2", "/vehiculos-extra/123", "/ordenes-trabajo-extra", "/sistema-extra", "/presupuestos-extra", "/presupuestos2/123"])(
    "no marca coincidencias incorrectas para %s", (ruta) => {
      deps.pathname.mockReturnValue(ruta);
      expect(renderToStaticMarkup(<NavegacionPrincipal enlaces={enlaces} />)).not.toContain("aria-current");
    },
  );

  it("actualiza la indicación cuando cambia la ruta", () => {
    const anterior = renderToStaticMarkup(<NavegacionPrincipal enlaces={enlaces} />);
    deps.pathname.mockReturnValue("/clientes");
    const actual = renderToStaticMarkup(<NavegacionPrincipal enlaces={enlaces} />);
    expect(anterior).toContain('href="/siniestros" aria-current="page"');
    expect(actual).toContain('href="/clientes" aria-current="page"');
    expect(actual).not.toContain('href="/siniestros" aria-current=');
  });
});

describe("selección de enlaces en el servidor", () => {
  it.each(roles)("conserva exactamente los destinos y su orden para %s", async (rol) => {
    prepararRol(rol);
    const html = await encabezado();
    expect([...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1])).toEqual(destinosPorRol[rol]);
    expect(html.includes(">Presupuestos</a>")).toBe(rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER");
    expect(html).toContain('aria-label="Navegación principal"');
    expect(html).toContain('alt="LuqGarage"');
    expect(html).toContain('type="submit"');
    expect(html).toContain("Cerrar sesión");
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.autorizar.mock.invocationCallOrder[0]!).toBeLessThan(deps.auth.mock.invocationCallOrder[0]!);
  });

  it("no muestra el encabezado cuando la autorización es denegada", async () => {
    deps.autorizar.mockResolvedValue({ autorizado: false });
    expect(await encabezado()).toBe("<main>Contenido de prueba</main>");
    expect(deps.auth).not.toHaveBeenCalled();
  });

  it.each(["MECANICO", "ADMINISTRADOR"] as const)("no entrega el enlace de presupuestos a %s aunque visite esa sección", async (rol) => {
    prepararRol(rol);
    deps.pathname.mockReturnValue("/presupuestos/123");
    const html = await encabezado();
    expect(html).not.toContain('href="/presupuestos"');
    expect(html).not.toContain("aria-current");
  });

  it("no agrega un enlace por visitar una ruta fuera de los enlaces recibidos", () => {
    deps.pathname.mockReturnValue("/presupuestos");
    const html = renderToStaticMarkup(<NavegacionPrincipal enlaces={[{ href: "/sistema", etiqueta: "Sistema" }]} />);
    expect(html).not.toContain('href="/presupuestos"');
    expect(html).not.toContain("aria-current");
  });
});

const navegador = [process.env.CHROME_PATH, chromium.executablePath(),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((ruta): ruta is string => Boolean(ruta && existsSync(ruta)));

// Layout y componentes reales con sesión y pathname simulados; sin API ni base de datos.
// Requiere npm run build para comprobar el CSS de producción.
describe.skipIf(!navegador)("encabezado adaptable y accesible en navegador", () => {
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
  beforeEach(async () => {
    page = await browser.newPage();
    const png = readFileSync("public/logo-luqgarage.png");
    await page.route("**/*", (ruta) => new URL(ruta.request().url()).pathname === "/_next/image"
      ? ruta.fulfill({ contentType: "image/png", body: png }) : ruta.abort());
  });
  afterEach(async () => { await page?.close(); });
  afterAll(async () => { await browser?.close(); });

  it.each([320, 375, 768, 1024, 1440])("conserva contenido, foco y superficies táctiles a %i px para todos los roles", async (ancho) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const rol of roles) {
      prepararRol(rol);
      const rutaActual = rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER" ? "/presupuestos" : destinosPorRol[rol][0];
      deps.pathname.mockReturnValue(rutaActual);
      await page.setContent(`<!doctype html><html lang="es" class="dark"><head><meta charset="utf-8"><base href="http://luqgarage.test"><style>${css}</style></head><body>${await encabezado()}</body></html>`);
      const logo = page.getByRole("img", { name: "LuqGarage" });
      await esperar.poll(() => logo.evaluate((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)).toBe(true);
      const nav = page.getByRole("navigation", { name: "Navegación principal" });
      expect(await nav.locator("a").evaluateAll((items) => items.map((item) => item.getAttribute("href")))).toEqual(destinosPorRol[rol]);
      await esperar(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await esperar(nav.locator('[aria-current="page"]')).toHaveAttribute("href", rutaActual);
      const salir = page.getByRole("button", { name: "Cerrar sesión" });
      const cajas = await Promise.all([logo.boundingBox(), page.getByText(correo, { exact: true }).boundingBox(), salir.boundingBox()]);
      for (let i = 0; i < cajas.length; i++) {
        const a = cajas[i]!;
        expect(a).not.toBeNull();
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.width).toBeLessThanOrEqual(ancho);
        for (const b of cajas.slice(i + 1)) {
          expect(a.x + a.width <= b!.x || b!.x + b!.width <= a.x || a.y + a.height <= b!.y || b!.y + b!.height <= a.y).toBe(true);
        }
      }
      expect(cajas[0]!.width / cajas[0]!.height).toBeCloseTo(270 / 203, 2);
      expect((await nav.boundingBox())!.y).toBeGreaterThanOrEqual(Math.max(...cajas.map((caja) => caja!.y + caja!.height)));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      const controles = [salir, ...await nav.locator("a").all()];
      // Reinicia el foco al reemplazar el documento para comprobar el orden real de Tab.
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      for (const control of controles) {
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await page.keyboard.press("Tab");
        await esperar(control).toBeFocused();
        await esperar.poll(() => control.evaluate((elemento) => {
          const estilo = getComputedStyle(elemento);
          return elemento.matches(":focus-visible") && (estilo.outlineStyle !== "none" || estilo.boxShadow !== "none");
        })).toBe(true);
      }
      if (rol === "ENCARGADO_DEL_TALLER") {
        mkdirSync("test-results", { recursive: true });
        await page.screenshot({ path: `test-results/navegacion-${ancho}.png`, fullPage: true });
      }
    }
  }, 30000);
});
