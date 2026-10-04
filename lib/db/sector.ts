import type { ClienteTransaccion } from "./transaccion";

export function asegurarSectorPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.sector.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
