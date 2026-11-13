import { z } from "zod";

const mensajeConfiguracion =
  "Configuración de pruebas de persistencia inválida. Se requieren GitHub Actions y URLs idénticas de PostgreSQL para luqgarage_test en 127.0.0.1:5432, sin parámetros ni fragmentos.";

const urlPruebasSchema = z.string().refine((valor) => {
  try {
    const url = new URL(valor);
    return (
      // No aceptar normalizaciones silenciosas de espacios o caracteres de control.
      url.href === valor &&
      ["postgresql:", "postgres:"].includes(url.protocol) &&
      url.hostname === "127.0.0.1" &&
      url.port === "5432" &&
      url.username === "luqgarage_test" &&
      url.pathname === "/luqgarage_test" &&
      !valor.includes("?") &&
      !valor.includes("#") &&
      !valor.includes("\\")
    );
  } catch {
    return false;
  }
}, mensajeConfiguracion);

export const entornoPruebasSchema = z.object({
  GITHUB_ACTIONS: z.string().refine((valor) => valor === "true", mensajeConfiguracion),
  DATABASE_URL: urlPruebasSchema,
  DIRECT_URL: urlPruebasSchema,
}).refine((entorno) => entorno.DATABASE_URL === entorno.DIRECT_URL, mensajeConfiguracion);

export function validarEntornoPruebas(entorno: Record<string, unknown>): void {
  if (entorno.PRUEBAS_PERSISTENCIA !== "1") return;

  if (!entornoPruebasSchema.safeParse(entorno).success) {
    // No propagar ZodError ni la entrada: podrían contener credenciales.
    throw new Error(mensajeConfiguracion);
  }
}
