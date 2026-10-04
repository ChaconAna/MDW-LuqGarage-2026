import type { Prisma } from "@prisma/client";

import { prisma } from "./client";

export type ClienteTransaccion = Prisma.TransactionClient;

export function ejecutarTransaccion<T>(
  operacion: (cliente: ClienteTransaccion) => Promise<T>,
) {
  return prisma.$transaction(operacion, {
    timeout: 30_000,
  });
}
