import { existsSync } from "node:fs";
import { build } from "esbuild";
import { chromium, expect as esperar, type Browser, type Page } from "@playwright/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { EstadoBajaVehiculo } from "../../app/(app)/vehiculos/[id]/actions";

const navegador = [
  process.env.CHROME_PATH,
  chromium.executablePath(),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((ruta): ruta is string => Boolean(ruta && existsSync(ruta)));

// React y DOM reales, con la Action simulada: estas pruebas no acceden a la base.
describe.skipIf(!navegador)("confirmación de baja de Vehículo en navegador", () => {
  let browser: Browser;
  let page: Page;
  let codigo: string;
  const baja = vi.fn<(entrada: unknown) => Promise<EstadoBajaVehiculo>>();
  const exito: EstadoBajaVehiculo = { inactivo: true, mensajeExito: "Vehículo dado de baja. Sus datos e historial se conservan." };

  beforeAll(async () => {
    const bundle = await build({
      stdin: {
        contents: `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import BajaVehiculo from "@/components/vehiculos/BajaVehiculo";
          const root = createRoot(document.getElementById("root"));
          window.montar = activo => root.render(<BajaVehiculo vehiculoId="10000000-0000-4000-8000-000000000001" activo={activo} />);
          window.montar(true);
        `,
        loader: "tsx", resolveDir: process.cwd(),
      },
      bundle: true, write: false, metafile: true, platform: "browser", jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      alias: { "@": process.cwd() },
      plugins: [{
        name: "baja-simulada",
        setup(compilador) {
          compilador.onResolve({ filter: /vehiculos[\\/]\[id\][\\/]actions$/ }, () => ({ path: "action", namespace: "simulado" }));
          compilador.onLoad({ filter: /.*/, namespace: "simulado" }, () => ({
            contents: "export const darDeBajaVehiculoAction = entrada => window.bajaSimulada(entrada);",
          }));
        },
      }],
    });
    expect(Object.keys(bundle.metafile.inputs).some((ruta) => /lib[\\/](db|services)[\\/]/.test(ruta))).toBe(false);
    codigo = bundle.outputFiles[0]!.text;
    browser = await chromium.launch({ executablePath: navegador, headless: true });
  }, 60000);

  beforeEach(async () => {
    baja.mockReset().mockResolvedValue(exito);
    page = await browser.newPage();
    await page.route("**/*", (ruta) => ruta.abort());
    await page.exposeFunction("bajaSimulada", (entrada: unknown) => baja(entrada));
    await page.setContent('<main><div id="root"></div></main>');
    await page.addScriptTag({ content: codigo });
    await esperar(page.getByRole("button", { name: "Dar de baja", exact: true })).toBeVisible();
  }, 30000);
  afterEach(async () => { await page?.close(); }, 30000);
  afterAll(async () => { await browser?.close(); }, 30000);

  async function abrirConfirmacion() {
    await page.getByRole("button", { name: "Dar de baja", exact: true }).click();
    await esperar(page.getByRole("button", { name: "Confirmar baja", exact: true })).toBeFocused();
  }
  async function actualizarActivo(activo: boolean) {
    await page.evaluate((valor) => {
      if (!("montar" in window) || typeof window.montar !== "function") {
        throw new Error("El escenario de prueba no está montado.");
      }
      window.montar(valor);
    }, activo);
  }

  it("exige confirmación y permite cancelar sin ejecutar la acción", async () => {
    await esperar(page.getByRole("button", { name: "Confirmar baja" })).toHaveCount(0);
    await page.locator("form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(baja).not.toHaveBeenCalled();
    await abrirConfirmacion();
    await esperar(page.getByRole("group", { name: "¿Confirmás la baja de este vehículo?" })).toContainText("conservará su historial");
    expect(baja).not.toHaveBeenCalled();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await esperar(page.getByRole("group", { name: "¿Confirmás la baja de este vehículo?" })).toHaveCount(0);
    await esperar(page.getByRole("button", { name: "Dar de baja", exact: true })).toBeFocused();
    expect(baja).not.toHaveBeenCalled();
  });

  it("bloquea envíos duplicados, muestra éxito y retira la baja y cualquier reactivación", async () => {
    let resolver!: (resultado: EstadoBajaVehiculo) => void;
    baja.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    await abrirConfirmacion();
    await page.getByRole("button", { name: "Confirmar baja", exact: true }).click();
    await esperar(page.getByRole("button", { name: "Confirmar baja", exact: true })).toBeDisabled();
    await esperar(page.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
    await page.locator("form").evaluate((form) => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(baja).toHaveBeenCalledExactlyOnceWith({ id: "10000000-0000-4000-8000-000000000001", confirmado: true });
    resolver(exito);
    await esperar(page.getByRole("status")).toHaveText(exito.mensajeExito!);
    await esperar(page.getByRole("status")).toBeFocused();
    await esperar(page.getByRole("button")).toHaveCount(0);
    await actualizarActivo(false);
    await esperar(page.getByRole("status")).toHaveText(exito.mensajeExito!);
  });

  it("no ofrece baja a inactivos ni permite confirmar con props obsoletas", async () => {
    await abrirConfirmacion();
    await actualizarActivo(false);
    await esperar(page.getByRole("button")).toHaveCount(0);
    await esperar(page.getByText(/Este vehículo está inactivo/)).toBeVisible();
    expect(baja).not.toHaveBeenCalled();
  });

  it.each(["Vehículo no encontrado.", "No tenés permisos para dar de baja vehículos."])("informa %s sin anunciar éxito", async (errorGeneral) => {
    baja.mockResolvedValue({ errorGeneral });
    await abrirConfirmacion();
    await page.getByRole("button", { name: "Confirmar baja", exact: true }).click();
    await esperar(page.getByRole("alert")).toHaveText(errorGeneral);
    await esperar(page.getByRole("group", { name: "¿Confirmás la baja de este vehículo?" })).toHaveCount(0);
    await esperar(page.getByRole("status")).toHaveCount(0);
    expect(baja).toHaveBeenCalledOnce();
  });

  it("retira los controles si otra sesión ya realizó la baja", async () => {
    baja.mockResolvedValue({ errorGeneral: "El vehículo ya está dado de baja.", inactivo: true });
    await abrirConfirmacion();
    await page.getByRole("button", { name: "Confirmar baja", exact: true }).click();
    await esperar(page.getByRole("alert")).toContainText("ya está dado de baja");
    await esperar(page.getByRole("button")).toHaveCount(0);
  });

  it("maneja fallas de transporte sin reintentar ni exponer detalles técnicos", async () => {
    baja.mockRejectedValue(new Error("secreto-simulado"));
    await abrirConfirmacion();
    await page.getByRole("button", { name: "Confirmar baja", exact: true }).click();
    await esperar(page.getByRole("alert")).toContainText("No pudimos confirmar la baja");
    await esperar(page.locator("body")).not.toContainText("secreto-simulado");
    expect(baja).toHaveBeenCalledOnce();
  });
});
