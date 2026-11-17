import type { ClienteTransaccion } from "./transaccion";
import { prisma } from "./client";

export async function listarModelosPorMarca(marcaId: string, page: number, limit: number) {
  const where = { marcaId };
  const [opciones, total] = await prisma.$transaction([
    prisma.modelo.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.modelo.count({ where }),
  ]);
  return { opciones, total };
}

export function obtenerModeloPorId(id: string) {
  return prisma.modelo.findUnique({ where: { id }, select: { id: true, marcaId: true } });
}

export function asegurarModeloPorMarcaYNombre(
  cliente: ClienteTransaccion,
  marcaId: string,
  nombre: string,
) {
  return cliente.modelo.upsert({
    where: { marcaId_nombre: { marcaId, nombre } },
    update: {},
    create: { marcaId, nombre },
  });
}
