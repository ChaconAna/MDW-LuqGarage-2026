import { expect, test } from "@playwright/test";

test("carga el login público sin sesión ni errores de configuración de Auth.js", async ({ page }) => {
  const respuesta = await page.goto("/login");

  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "LuqGarage", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar con Google", exact: true })).toBeVisible();

  // El formulario puede aparecer aunque auth() interprete un fallo como ausencia de sesión.
  // El endpoint real devuelve 500 ante MissingSecret o UntrustedHost, y 200/null sin sesión.
  const sesion = await page.request.get("/api/auth/session");
  expect(sesion.status()).toBe(200);
  expect(await sesion.json()).toBeNull();
});
