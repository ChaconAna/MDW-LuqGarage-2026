import type { Prisma } from "@prisma/client";

import { prisma } from "./client";
import type { ClienteTransaccion } from "./transaccion";

export async function listarLocalidades(
  page: number,
  limit: number,
  busqueda = "",
) {
  const termino = busqueda.trim();
  const where = termino
    ? ({
        OR: [
          { nombre: { contains: termino, mode: "insensitive" } },
          {
            provincia: {
              nombre: { contains: termino, mode: "insensitive" },
            },
          },
        ],
      } satisfies Prisma.LocalidadWhereInput)
    : undefined;

  const [localidades, total] = await prisma.$transaction([
    prisma.localidad.findMany({
      ...(where ? { where } : {}),
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
    where ? prisma.localidad.count({ where }) : prisma.localidad.count(),
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
