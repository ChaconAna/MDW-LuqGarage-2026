import type { ClienteTransaccion } from "./transaccion";

export function asegurarMarcaPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.marca.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
