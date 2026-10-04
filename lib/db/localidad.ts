import type { ClienteTransaccion } from "./transaccion";

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
