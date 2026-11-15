import { expect, test } from "@playwright/test";

test("inicia sesión con Auth.js Credentials y accede al alta de siniestro", async ({
  page,
}) => {
  const csrf = await page.request.get("/api/auth/csrf");
  expect(csrf.status()).toBe(200);
  const cuerpoCsrf = (await csrf.json()) as { csrfToken?: unknown };
  expect(typeof cuerpoCsrf.csrfToken).toBe("string");

  const inicioSesion = await page.request.post("/api/auth/callback/e2e", {
    form: {
      callbackUrl: "http://127.0.0.1:3000/siniestros/nuevo",
      credencial: process.env.AUTENTICACION_E2E_CREDENCIAL!,
      csrfToken: cuerpoCsrf.csrfToken as string,
    },
    headers: { "X-Auth-Return-Redirect": "1" },
  });
  expect(inicioSesion.status()).toBe(200);
  await expect(inicioSesion.json()).resolves.toMatchObject({
    url: "http://127.0.0.1:3000/siniestros/nuevo",
  });

  const respuestaSesion = await page.request.get("/api/auth/session");
  expect(respuestaSesion.status()).toBe(200);
  await expect(respuestaSesion.json()).resolves.toMatchObject({
    user: {
      usuarioId: process.env.AUTENTICACION_E2E_USUARIO_ID,
      rol: "ENCARGADO_DEL_TALLER",
    },
  });

  const respuestaPagina = await page.goto("/siniestros/nuevo");

  expect(respuestaPagina?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/siniestros/nuevo");
  await expect(
    page.getByRole("heading", { name: "Registrar siniestro", exact: true }),
  ).toBeVisible();
});
