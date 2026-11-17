import type { ClienteTransaccion } from "./transaccion";
import { prisma } from "./client";

export async function listarTiposVehiculo(page: number, limit: number) {
  const [opciones, total] = await prisma.$transaction([
    prisma.tipoVehiculo.findMany({
      skip: (page - 1) * limit, take: limit, orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.tipoVehiculo.count(),
  ]);
  return { opciones, total };
}

export function asegurarTipoVehiculoPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.tipoVehiculo.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
