import { z } from "zod";

import { urlBasePruebasSchema } from "./entornoPruebas";

const mensajeConfiguracion =
  "Configuración de autenticación E2E inválida. Solo puede habilitarse en el entorno de pruebas local autorizado.";

const authUrlE2eSchema = z
  .string()
  .refine(
    (valor) => valor === "http://127.0.0.1:3000",
    mensajeConfiguracion,
  );

const credencialE2eSchema = z.string().min(32).max(256);

export const credencialesAutenticacionE2eSchema = z.object({
  credencial: credencialE2eSchema,
});

export const entornoAutenticacionE2eSchema = z
  .object({
    AUTENTICACION_E2E: z.literal("1"),
    GITHUB_ACTIONS: z.literal("true"),
    NODE_ENV: z.literal("production"),
    DATABASE_URL: urlBasePruebasSchema,
    DIRECT_URL: urlBasePruebasSchema,
    AUTH_URL: authUrlE2eSchema,
    AUTENTICACION_E2E_CREDENCIAL: credencialE2eSchema,
    AUTENTICACION_E2E_USUARIO_ID: z.string().uuid(),
  })
  .refine(
    (entorno) => entorno.DATABASE_URL === entorno.DIRECT_URL,
    mensajeConfiguracion,
  );

export function validarEntornoAutenticacionE2e(
  entorno: Record<string, unknown>,
): boolean {
  if (entorno.AUTENTICACION_E2E !== "1") {
    return false;
  }

  if (!entornoAutenticacionE2eSchema.safeParse(entorno).success) {
    // No propagar el ZodError ni valores del entorno: podrían contener secretos.
    throw new Error(mensajeConfiguracion);
  }

  return true;
}
