import type { FullConfig } from "@playwright/test";

import { validarEntornoAutenticacionE2e } from "../../lib/schemas/entornoE2e";

const baseURL = "http://127.0.0.1:3000";

export default async function globalSetup(_config: FullConfig) {
  if (
    !validarEntornoAutenticacionE2e({
      ...process.env,
      AUTH_URL: baseURL,
      NODE_ENV: "production",
    })
  ) {
    throw new Error("La autenticación E2E no está habilitada.");
  }

  process.env.PRUEBAS_PERSISTENCIA = "1";

  const [{ eliminarUsuarioE2e, prepararUsuarioE2e }, { prisma }] =
    await Promise.all([
      import("../../lib/db/usuarioE2e"),
      import("../../lib/db/client"),
    ]);
  const usuarioId = process.env.AUTENTICACION_E2E_USUARIO_ID!;

  const usuarioCreado = await prepararUsuarioE2e(usuarioId);

  return async () => {
    try {
      await eliminarUsuarioE2e(usuarioId, usuarioCreado);
    } finally {
      await prisma.$disconnect();
    }
  };
}
