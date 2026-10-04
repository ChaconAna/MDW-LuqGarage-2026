import type { ClienteTransaccion } from "./transaccion";

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
