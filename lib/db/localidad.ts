import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

export async function listarLocalidades(page: number, limit: number) {
  const [localidades, total] = await prisma.$transaction([
    prisma.localidad.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: {
        id: true,
        nombre: true,
        provincia: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    }),
    prisma.localidad.count(),
  ]);

  return { localidades, total };
}

export function asegurarLocalidadPorProvinciaYNombre(
  cliente: ClienteTransaccion,
  provinciaId: string,
  nombre: string,
) {
  return cliente.localidad.upsert({
    where: { provinciaId_nombre: { provinciaId, nombre } },
    update: {},
    create: { provinciaId, nombre },
  });
}
