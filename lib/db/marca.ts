import type { ClienteTransaccion } from "./transaccion";
import { prisma } from "./client";

export async function listarMarcas(page: number, limit: number) {
  const [opciones, total] = await prisma.$transaction([
    prisma.marca.findMany({
      skip: (page - 1) * limit, take: limit, orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.marca.count(),
  ]);
  return { opciones, total };
}

export function asegurarMarcaPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.marca.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
