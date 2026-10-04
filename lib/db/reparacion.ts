import type { ClienteTransaccion } from "./transaccion";

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
