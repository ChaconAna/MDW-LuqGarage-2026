import { prisma } from "./client";

export async function asegurarSectorPorNombre(nombre: string) {
  return prisma.sector.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
