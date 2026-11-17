import { existsSync } from "node:fs";
import { build } from "esbuild";
import { chromium, expect as esperar, type Browser, type Page } from "@playwright/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { crearVehiculoAction, consultarCatalogoVehiculoAction, EstadoFormularioVehiculo } from "../../app/(app)/vehiculos/nuevo/actions";
import { catalogoVehiculoQuerySchema } from "../../lib/schemas/altaVehiculo";

const navegador = [process.env.CHROME_PATH, chromium.executablePath(),
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((ruta): ruta is string => Boolean(ruta && existsSync(ruta)));
const uuid = (numero: number) => `10000000-0000-4000-8000-${String(numero).padStart(12, "0")}`;
const marcas = Array.from({ length: 11 }, (_, indice) => ({ id: uuid(indice + 1), nombre: `Marca ${indice + 1}` }));
const tipos = [{ id: uuid(201), nombre: "Automóvil" }];

// React y navegador reales; únicamente las Actions y la navegación están simuladas.
describe.skipIf(!navegador)("formulario de alta de Vehículo en navegador", () => {
  let browser: Browser;
  let page: Page;
  let codigo: string;
  const crear = vi.fn<typeof crearVehiculoAction>();
  const consultar = vi.fn<typeof consultarCatalogoVehiculoAction>();
  const navegar = vi.fn();

  beforeAll(async () => {
    const bundle = await build({
      stdin: {
        contents: `
          import React from "react";
          import {createRoot} from "react-dom/client";
          import Formulario from "@/components/vehiculos/FormularioVehiculo";
          const root = createRoot(document.getElementById("root"));
          window.montarEdicion = (vehiculo) => root.render(<Formulario key="edicion"
            vehiculoInicial={vehiculo} guardarAction={(...args) => window.crearSimulado(...args)} hrefCancelar={'/vehiculos/' + vehiculo.id}
            marcasIniciales={${JSON.stringify({ opciones: marcas.slice(0, 10), total: 11, pagina: 1 })}}
            tiposIniciales={${JSON.stringify({ opciones: tipos, total: 1, pagina: 1 })}} />);
          root.render(<Formulario
            marcasIniciales={${JSON.stringify({ opciones: marcas.slice(0, 10), total: 11, pagina: 1 })}}
            tiposIniciales={${JSON.stringify({ opciones: tipos, total: 1, pagina: 1 })}} />);
        `,
        loader: "tsx", resolveDir: process.cwd(),
      },
      bundle: true, write: false, metafile: true, platform: "browser", jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' }, alias: { "@": process.cwd() },
      plugins: [{ name: "alta-simulada", setup(compilador) {
        compilador.onResolve({ filter: /vehiculos[\\/]nuevo[\\/]actions$/ }, () => ({ path: "actions", namespace: "simulado" }));
        compilador.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "simulado" }));
        compilador.onLoad({ filter: /.*/, namespace: "simulado" }, ({ path }) => ({
          loader: "jsx", resolveDir: process.cwd(),
          contents: path === "actions"
            ? "export const crearVehiculoAction = (...args) => window.crearSimulado(...args); export const consultarCatalogoVehiculoAction = entrada => window.consultarSimulado(entrada);"
            : 'import React from "react"; export default function Link({href, children, ...props}) { return <a {...props} href={href} onClick={e => { e.preventDefault(); window.navegarSimulado(href); }}>{children}</a>; }',
        }));
      } }],
    });
    expect(Object.keys(bundle.metafile.inputs).some((ruta) => /lib[\\/](db|services)[\\/]/.test(ruta))).toBe(false);
    codigo = bundle.outputFiles[0]!.text;
    browser = await chromium.launch({ executablePath: navegador, headless: true });
  }, 60000);

  beforeEach(async () => {
    crear.mockReset().mockResolvedValue({ errores: {} });
    navegar.mockReset();
    consultar.mockReset().mockImplementation(async (entrada) => {
      const datos = catalogoVehiculoQuerySchema.parse(entrada);
      if (datos.tipo === "marcas") return { ok: true, opciones: marcas.slice((datos.page - 1) * 10, datos.page * 10), total: 11, pagina: datos.page };
      if (datos.tipo === "tipos") return { ok: true, opciones: tipos, total: 1, pagina: 1 };
      const numero = Number(datos.marcaId.slice(-12));
      return { ok: true, opciones: [{ id: uuid(100 + numero), nombre: `Modelo ${numero}` }], total: 1, pagina: 1 };
    });
    page = await browser.newPage();
    await page.route("**/*", (ruta) => ruta.abort());
    await page.exposeFunction("crearSimulado", (estado: EstadoFormularioVehiculo, entrada: unknown) => crear(estado, entrada));
    await page.exposeFunction("consultarSimulado", (entrada: unknown) => consultar(entrada));
    await page.exposeFunction("navegarSimulado", (href: string) => navegar(href));
    await page.setContent('<main><div id="root"></div></main>');
    await page.addScriptTag({ content: codigo });
    await esperar(page.getByLabel("Patente (obligatoria)")).toBeVisible();
  }, 30000);
  afterEach(async () => { await page?.close(); }, 30000);
  afterAll(async () => { await browser?.close(); }, 30000);

  async function elegirMarca(numero = 1) {
    await page.getByLabel("Marca (obligatorio)", { exact: true }).selectOption(uuid(numero));
    await esperar(page.locator(`#vehiculo-modelos option[value="${uuid(100 + numero)}"]`)).toHaveCount(1);
  }
  async function completar() {
    await page.getByLabel("Patente (obligatoria)").fill("AA123BB");
    await elegirMarca();
    await page.getByLabel("Modelo (obligatorio)", { exact: true }).selectOption(uuid(101));
    await page.getByLabel("Tipo de vehículo (obligatorio)").selectOption(uuid(201));
  }

  async function montarEdicion() {
    await page.evaluate((vehiculo) => {
      const montar = Reflect.get(window, "montarEdicion") as (datos: unknown) => void;
      montar(vehiculo);
    }, { id: uuid(500), patente: "ANT123", activo: false,
      modelo: { id: uuid(999), nombre: "Modelo actual", marca: marcas[10] },
      tipoVehiculo: { id: uuid(888), nombre: "Tipo actual" } });
    await esperar(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
    await esperar(page.locator("#vehiculo-modelos")).toBeEnabled();
  }

  it("precarga la edición fuera de las páginas de catálogos y cancela al detalle sin guardar", async () => {
    await montarEdicion();
    await esperar(page.locator("#vehiculo-patente")).toHaveValue("ANT123");
    await esperar(page.locator("#vehiculo-marcas")).toHaveValue(uuid(11));
    await esperar(page.locator("#vehiculo-modelos")).toHaveValue(uuid(999));
    await esperar(page.locator("#vehiculo-tipos")).toHaveValue(uuid(888));
    await page.getByRole("link", { name: "Cancelar" }).click();
    expect(navegar).toHaveBeenCalledExactlyOnceWith(`/vehiculos/${uuid(500)}`);
    expect(crear).not.toHaveBeenCalled();
  });

  it("edita datos precargados, limpia Modelo al cambiar Marca y conserva datos ante errores", async () => {
    await montarEdicion();
    await page.locator("#vehiculo-patente").fill("NUE123");
    await elegirMarca(2);
    await esperar(page.locator("#vehiculo-modelos")).toHaveValue("");
    await page.locator("#vehiculo-modelos").selectOption(uuid(102));
    await page.locator("#vehiculo-tipos").selectOption(uuid(201));
    crear.mockResolvedValue({ errores: { patente: "Patente duplicada." }, errorGeneral: "Revisá la patente." });
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await esperar(page.getByRole("alert")).toHaveText("Revisá la patente.");
    expect(crear.mock.calls[0]?.[1]).toEqual({ patente: "NUE123", marcaId: uuid(2), modeloId: uuid(102), tipoVehiculoId: uuid(201) });
    await esperar(page.locator("#vehiculo-patente")).toHaveValue("NUE123");
    await esperar(page.locator("#vehiculo-modelos")).toHaveValue(uuid(102));
  });

  it("exige Marca antes del Modelo y permite cancelar sin guardar", async () => {
    await esperar(page.getByLabel("Modelo (obligatorio)", { exact: true })).toBeDisabled();
    await page.getByRole("link", { name: "Cancelar" }).click();
    expect(navegar).toHaveBeenCalledExactlyOnceWith("/vehiculos");
    expect(crear).not.toHaveBeenCalled();
  });

  it("filtra Modelos por Marca, limpia la selección al cambiarla y envía solo los campos del alta", async () => {
    await completar();
    await elegirMarca(2);
    await esperar(page.getByLabel("Modelo (obligatorio)", { exact: true })).toHaveValue("");
    await esperar(page.locator(`#vehiculo-modelos option[value="${uuid(101)}"]`)).toHaveCount(0);
    await page.getByLabel("Modelo (obligatorio)", { exact: true }).selectOption(uuid(102));
    await page.getByRole("button", { name: "Guardar vehículo", exact: true }).click();
    await esperar(page.locator("form")).toHaveAttribute("aria-busy", "false");
    expect(crear.mock.calls[0]?.[1]).toEqual({ patente: "AA123BB", marcaId: uuid(2), modeloId: uuid(102), tipoVehiculoId: uuid(201) });
    expect(consultar).toHaveBeenCalledWith({ tipo: "modelos", marcaId: uuid(2), page: 1, limit: 10 });
  });

  it("permite elegir Marcas de otras páginas y conserva la selección al paginar", async () => {
    await page.getByRole("navigation", { name: "Paginación de Marca", exact: true }).getByRole("button", { name: "Siguiente" }).click();
    await esperar(page.locator(`#vehiculo-marcas option[value="${uuid(11)}"]`)).toHaveCount(1);
    await elegirMarca(11);
    await page.getByRole("navigation", { name: "Paginación de Marca", exact: true }).getByRole("button", { name: "Anterior" }).click();
    await esperar(page.locator("#vehiculo-marcas")).toHaveValue(uuid(11));
    await esperar(page.locator(`#vehiculo-modelos option[value="${uuid(111)}"]`)).toHaveCount(1);
  });

  it("una respuesta tardía de Modelos no reemplaza los de la Marca actual", async () => {
    let resolver!: (valor: Awaited<ReturnType<typeof consultarCatalogoVehiculoAction>>) => void;
    consultar.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve; }));
    await page.locator("#vehiculo-marcas").selectOption(uuid(1));
    await esperar(page.getByRole("status")).toContainText("Cargando Modelo");
    await elegirMarca(2);
    resolver({ ok: true, opciones: [{ id: uuid(101), nombre: "Modelo anterior" }], total: 1, pagina: 1 });
    await esperar(page.locator(`#vehiculo-modelos option[value="${uuid(102)}"]`)).toHaveCount(1);
    await esperar(page.locator("#vehiculo-modelos")).not.toContainText("Modelo anterior");
  });

  it("bloquea envíos duplicados y conserva los valores ante patente duplicada", async () => {
    let resolver!: (valor: EstadoFormularioVehiculo) => void;
    crear.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    await completar();
    await page.getByRole("button", { name: "Guardar vehículo", exact: true }).click();
    await esperar(page.getByRole("button", { name: "Guardando vehículo…", exact: true })).toBeDisabled();
    await page.locator("form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(crear).toHaveBeenCalledOnce();
    resolver({ errores: { patente: "Patente duplicada." }, errorGeneral: "Ya existe un Vehículo con la patente indicada." });
    await esperar(page.getByRole("alert")).toContainText("Ya existe");
    await esperar(page.getByLabel("Patente (obligatoria)")).toBeFocused();
    await esperar(page.getByLabel("Patente (obligatoria)")).toHaveValue("AA123BB");
    await esperar(page.locator("#vehiculo-modelos")).toHaveValue(uuid(101));
  });

  it("muestra validación del servidor y permite corregir los campos", async () => {
    crear.mockResolvedValue({ errores: { patente: "Ingresá la patente.", marcaId: "Seleccioná una Marca válida." }, errorGeneral: "Revisá los campos indicados." });
    await page.getByRole("button", { name: "Guardar vehículo", exact: true }).click();
    await esperar(page.getByRole("alert")).toHaveText("Revisá los campos indicados.");
    await esperar(page.getByLabel("Patente (obligatoria)")).toHaveAttribute("aria-invalid", "true");
    await esperar(page.locator("#vehiculo-marcas")).toBeEnabled();
  });

  it("maneja fallas y catálogos vacíos sin seleccionar Modelos automáticamente", async () => {
    consultar.mockResolvedValueOnce({ ok: false, error: "No pudimos cargar las opciones. Intentá nuevamente." });
    await page.locator("#vehiculo-marcas").selectOption(uuid(1));
    await esperar(page.getByRole("alert")).toHaveText("No pudimos cargar las opciones. Intentá nuevamente.");
    consultar.mockResolvedValueOnce({ ok: true, opciones: [], total: 0, pagina: 1 });
    await page.getByRole("button", { name: "Reintentar Modelo", exact: true }).click();
    await esperar(page.getByText("No hay opciones disponibles para Modelo.")).toBeVisible();
    await esperar(page.locator("#vehiculo-modelos")).toHaveValue("");
    expect(crear).not.toHaveBeenCalled();
  });
});
