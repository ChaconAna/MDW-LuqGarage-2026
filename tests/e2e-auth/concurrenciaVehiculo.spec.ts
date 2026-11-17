import { expect, test } from "@playwright/test";

import { prepararConcurrenciaVehiculoE2e } from "../../lib/db/concurrenciaVehiculoE2e";
import { csrfConcurrenciaVehiculoE2eSchema } from "../../lib/schemas/concurrenciaVehiculoE2e";

test("Clase 14: diez altas simultáneas de una patente producen un 201, nueve 409 y un vehículo persistido", async ({
  request,
}) => {
  test.setTimeout(60_000);

  // Auth.js real con el proveedor E2E existente; el endpoint conserva su autorización.
  const csrf = await request.get("/api/auth/csrf");
  expect(csrf.status()).toBe(200);
  const { csrfToken } = csrfConcurrenciaVehiculoE2eSchema.parse(await csrf.json());
  const inicioSesion = await request.post("/api/auth/callback/e2e", {
    form: {
      callbackUrl: "/vehiculos",
      credencial: process.env.AUTENTICACION_E2E_CREDENCIAL!,
      csrfToken,
    },
    headers: { "X-Auth-Return-Redirect": "1" },
  });
  expect(inicioSesion.status()).toBe(200);
  const sesion = await request.get("/api/auth/session");
  expect(sesion.status()).toBe(200);
  await expect(sesion.json()).resolves.toMatchObject({
    user: {
      usuarioId: process.env.AUTENTICACION_E2E_USUARIO_ID,
      rol: "ENCARGADO_DEL_TALLER",
    },
  });

  const fixture = await prepararConcurrenciaVehiculoE2e();
  const pedidos = Array.from({ length: 10 }, () =>
    request.post("/api/vehiculos", { data: fixture.datos, timeout: 15_000 }),
  );
  const errores: unknown[] = [];
  try {
    const respuestas = await Promise.all(pedidos);
    const estados = respuestas.map((respuesta) => respuesta.status());
    // Se consulta PostgreSQL directamente, no se infiere persistencia del HTTP.
    const persistidos = await fixture.contar();
    console.log(`Clase 14: HTTP ${estados.join(", ")}; vehículos persistidos: ${persistidos}.`);
    expect(estados.filter((estado) => estado === 201)).toHaveLength(1);
    expect(estados.filter((estado) => estado === 409)).toHaveLength(9);
    expect(persistidos).toBe(1);
  } catch (error: unknown) {
    errores.push(error);
  } finally {
    // Incluso ante un error de transporte, esperar los diez pedidos antes de limpiar.
    await Promise.allSettled(pedidos);
    try {
      await fixture.limpiar();
    } catch (error: unknown) {
      errores.push(error);
    }
  }
  if (errores.length > 0) {
    throw new AggregateError(errores, "Falló la concurrencia de patente o su limpieza.");
  }
});
