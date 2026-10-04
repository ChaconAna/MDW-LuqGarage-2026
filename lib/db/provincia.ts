import type { ClienteTransaccion } from "./transaccion";

export function asegurarProvinciaPorNombre(
  cliente: ClienteTransaccion,
  nombre: string,
) {
  return cliente.provincia.upsert({
    where: { nombre },
    update: {},
    create: { nombre },
  });
}
