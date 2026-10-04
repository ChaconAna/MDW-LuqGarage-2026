import type { ClienteTransaccion } from "./transaccion";

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
