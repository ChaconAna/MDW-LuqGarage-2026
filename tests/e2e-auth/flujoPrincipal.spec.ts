import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

import {
  crearCredencialStorageE2e,
  URL_STORAGE_E2E,
} from "../../lib/services/storageHttpE2e";

const manifiestoSchema = z.object({
  cliente: z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
    apellido: z.string().min(1),
  }),
  vehiculo: z.object({
    id: z.string().uuid(),
    patente: z.string().min(1),
  }),
  aseguradora: z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
  }),
  reparacion: z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
  }),
  sector: z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
  }),
  playwright: z.object({
    numeroSiniestro: z.string().min(1),
    numeroPoliza: z.string().min(1),
    numeroPresupuesto: z.string().min(1),
  }),
});

const inspeccionStorageSchema = z.object({
  cantidad: z.number().int().nonnegative(),
  objetos: z.array(
    z.object({
      ruta: z.string().min(1),
      tamano: z.number().int().positive(),
    }),
  ),
});

function leerManifiesto() {
  const serializado = process.env.FLUJO_PRINCIPAL_E2E_MANIFIESTO;
  if (!serializado) throw new Error("No se preparo el manifiesto del flujo E2E.");

  try {
    return manifiestoSchema.parse(JSON.parse(serializado));
  } catch {
    throw new Error("El manifiesto del flujo E2E no es valido.");
  }
}

async function iniciarSesion(page: Page) {
  const csrf = await page.request.get("/api/auth/csrf");
  expect(csrf.status()).toBe(200);
  const cuerpoCsrf = z.object({ csrfToken: z.string().min(1) }).parse(await csrf.json());

  const respuesta = await page.request.post("/api/auth/callback/e2e", {
    form: {
      callbackUrl: "/siniestros/nuevo",
      credencial: process.env.AUTENTICACION_E2E_CREDENCIAL!,
      csrfToken: cuerpoCsrf.csrfToken,
    },
    headers: { "X-Auth-Return-Redirect": "1" },
  });
  expect(respuesta.status()).toBe(200);
}

test("completa Siniestro, Presupuesto aprobado y Orden de Trabajo finalizada", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const manifiesto = leerManifiesto();
  await iniciarSesion(page);

  await page.goto("/siniestros/nuevo");
  await page.locator(`input[name="clienteId"][value="${manifiesto.cliente.id}"]`).check();
  await expect(page.getByText(`Cliente seleccionado: ${manifiesto.cliente.nombre} ${manifiesto.cliente.apellido}`)).toBeVisible();
  await page.locator(`input[name="vehiculoId"][value="${manifiesto.vehiculo.id}"]`).check();
  await expect(page.getByText(`Vehículo seleccionado: ${manifiesto.vehiculo.patente}`)).toBeVisible();
  await page.locator(`input[name="aseguradoraId"][value="${manifiesto.aseguradora.id}"]`).check();
  await expect(page.getByText(`Aseguradora seleccionada: ${manifiesto.aseguradora.nombre}`)).toBeVisible();

  await page.getByLabel("Número de siniestro (obligatorio)").fill(manifiesto.playwright.numeroSiniestro);
  await page.getByLabel("Fecha del siniestro (obligatoria)").fill("2026-01-10");
  await page.getByLabel("Número de póliza (obligatorio)").fill(manifiesto.playwright.numeroPoliza);
  await page.getByLabel("Leve").check();

  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const etiquetasDocumentos = [
    "Foto de la denuncia (obligatoria)",
    "Foto lateral derecha (obligatoria)",
    "Foto lateral izquierda (obligatoria)",
    "Foto frontal (obligatoria)",
    "Foto trasera (obligatoria)",
    "Foto del certificado de cobertura (obligatoria)",
  ];
  for (const [indice, etiqueta] of etiquetasDocumentos.entries()) {
    await page.getByLabel(etiqueta, { exact: true }).setInputFiles({
      name: `documento-${indice + 1}.png`,
      mimeType: "image/png",
      buffer: png,
    });
  }

  await page.getByRole("button", { name: "Registrar siniestro", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Siniestro ${manifiesto.playwright.numeroSiniestro}` })).toBeVisible();
  await expect(page.getByText("Estado: REGISTRADO", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Documentos asociados" }).getByRole("listitem")).toHaveCount(6);

  const credencialStorage = crearCredencialStorageE2e(
    process.env.AUTENTICACION_E2E_CREDENCIAL!,
  );
  const inspeccionStorage = await request.get(
    `${URL_STORAGE_E2E}/__e2e/storage/objetos`,
    {
      headers: {
        apikey: credencialStorage,
        authorization: `Bearer ${credencialStorage}`,
      },
    },
  );
  expect(inspeccionStorage.status()).toBe(200);
  const objetos = inspeccionStorageSchema.parse(await inspeccionStorage.json());
  expect(objetos.cantidad).toBe(6);
  expect(objetos.objetos).toHaveLength(6);
  expect(objetos.objetos.every(({ ruta, tamano }) => ruta.startsWith("siniestros/") && tamano === png.byteLength)).toBe(true);

  await page.getByRole("link", { name: "Crear presupuesto", exact: true }).click();
  await page.getByLabel("Número de presupuesto (obligatorio)").fill(manifiesto.playwright.numeroPresupuesto);
  await page.getByLabel("Catálogo de reparaciones").selectOption(manifiesto.reparacion.id);
  await page.getByRole("button", { name: "Agregar reparación", exact: true }).click();
  await page.getByLabel(`Costo de ${manifiesto.reparacion.nombre}`).fill("1000.00");
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();

  await expect(page.getByRole("heading", { name: `Presupuesto ${manifiesto.playwright.numeroPresupuesto}` })).toBeVisible();
  await expect(page.getByText("Estado: BORRADOR", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: manifiesto.reparacion.nombre })).toContainText("1000.00");

  await page.getByRole("button", { name: "Registrar envío externo", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar ENVIADO", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "El envío externo del presupuesto quedó registrado." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Estado: ENVIADO", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Registrar aprobación", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar APROBADO", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "La respuesta externa de aprobación quedó registrada." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Estado: APROBADO", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: new RegExp(`Volver al siniestro ${manifiesto.playwright.numeroSiniestro}`) }).click();
  await expect(page.getByText("Estado: PRESUPUESTADO", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Crear orden de trabajo", exact: true }).click();
  await page.getByLabel(`Presupuesto ${manifiesto.playwright.numeroPresupuesto}`, { exact: true }).check();
  await page.getByRole("button", { name: "Crear orden de trabajo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Orden de trabajo", exact: true })).toBeVisible();
  await expect(page.getByText("Estado: BORRADOR", { exact: true })).toBeVisible();
  await expect(page.getByText(`Siniestro: ${manifiesto.playwright.numeroSiniestro}`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Presupuesto ${manifiesto.playwright.numeroPresupuesto}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: manifiesto.sector.nombre, exact: true })).toBeVisible();
  await expect(page.getByText(manifiesto.reparacion.nombre, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Finalizar orden de trabajo", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar FINALIZADA", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "La confección de la orden de trabajo quedó FINALIZADA." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Estado: FINALIZADA", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar orden de trabajo", exact: true })).toHaveCount(0);
});
