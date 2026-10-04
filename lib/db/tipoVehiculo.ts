import type { ClienteTransaccion } from "./transaccion";

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
