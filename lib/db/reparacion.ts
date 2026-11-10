import type { ClienteTransaccion } from "./transaccion";
import { prisma } from "./client";

export async function listarReparaciones(page: number, limit: number) {
  const [opciones, total] = await prisma.$transaction([
    prisma.reparacion.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.reparacion.count(),
  ]);
  return { opciones, total };
}

export function asegurarReparacionPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
  sectorId: string,
) {
  return cliente.reparacion.upsert({
    where: { nombre },
    update: { sectorId },
    create: { nombre, sectorId },
  });
}
