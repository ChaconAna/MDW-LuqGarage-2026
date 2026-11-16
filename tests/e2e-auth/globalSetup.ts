import type { FullConfig } from "@playwright/test";

import { validarEntornoAutenticacionE2e } from "../../lib/schemas/entornoE2e";
import {
  iniciarStorageHttpE2e,
  PUERTO_STORAGE_E2E,
  type ServidorStorageHttpE2e,
} from "../../lib/services/storageHttpE2e";

type PrismaE2e = typeof import("../../lib/db/client").prisma;
type EliminarUsuarioE2e =
  typeof import("../../lib/db/usuarioE2e").eliminarUsuarioE2e;

async function detenerStorageConRecuperacion(storage: ServidorStorageHttpE2e) {
  try {
    await storage.detener();
  } catch (errorInicial: unknown) {
    try {
      await storage.detener();
    } catch (errorRecuperacion: unknown) {
      throw new AggregateError(
        [errorInicial, errorRecuperacion],
        "No se pudo detener el Storage E2E.",
      );
    }

    throw errorInicial;
  }
}

async function ejecutarLimpieza(
  acciones: ReadonlyArray<() => Promise<unknown>>,
  errorOriginal?: unknown,
) {
  const errores: unknown[] = errorOriginal === undefined ? [] : [errorOriginal];

  for (const accion of acciones) {
    try {
      await accion();
    } catch (error: unknown) {
      errores.push(error);
    }
  }

  if (errores.length === 1) throw errores[0];
  if (errores.length > 1) {
    throw new AggregateError(
      errores,
      "Falló la preparación o limpieza del entorno E2E.",
    );
  }
}

export default async function globalSetup(_config: FullConfig) {
  if (!validarEntornoAutenticacionE2e(process.env)) {
    throw new Error("La autenticación E2E no está habilitada.");
  }

  process.env.PRUEBAS_PERSISTENCIA = "1";

  let storage: ServidorStorageHttpE2e | undefined;
  let prisma: PrismaE2e | undefined;
  let eliminarUsuarioE2e: EliminarUsuarioE2e | undefined;
  let usuarioCreado = false;
  const usuarioId = process.env.AUTENTICACION_E2E_USUARIO_ID!;

  try {
    storage = await iniciarStorageHttpE2e({ puerto: PUERTO_STORAGE_E2E });

    const [moduloUsuario, moduloCliente] = await Promise.all([
      import("../../lib/db/usuarioE2e"),
      import("../../lib/db/client"),
    ]);
    prisma = moduloCliente.prisma;
    eliminarUsuarioE2e = moduloUsuario.eliminarUsuarioE2e;
    usuarioCreado = await moduloUsuario.prepararUsuarioE2e(usuarioId);
  } catch (error: unknown) {
    const acciones: Array<() => Promise<unknown>> = [];
    if (prisma) {
      const clientePreparado = prisma;
      acciones.push(() => clientePreparado.$disconnect());
    }
    if (storage) {
      const storageIniciado = storage;
      acciones.push(() => detenerStorageConRecuperacion(storageIniciado));
    }

    await ejecutarLimpieza(acciones, error);
    throw error;
  }

  return async () => {
    await ejecutarLimpieza([
      () => eliminarUsuarioE2e(usuarioId, usuarioCreado),
      () => prisma.$disconnect(),
      () => detenerStorageConRecuperacion(storage),
    ]);
  };
}
