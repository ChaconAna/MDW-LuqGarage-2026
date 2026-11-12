import type { ClienteTransaccion } from "./transaccion";
import { prisma } from "./client";

export async function listarRepuestos(page: number, limit: number) {
  const [opciones, total] = await prisma.$transaction([
    prisma.repuesto.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.repuesto.count(),
  ]);
  return { opciones, total };
}

export function asegurarRepuestoPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.repuesto.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
