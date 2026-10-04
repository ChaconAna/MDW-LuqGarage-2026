import type { ClienteTransaccion } from "./transaccion";

type DatosVehiculo = {
  patente: string;
  activo: boolean;
  modeloId: string;
  tipoVehiculoId: string;
};

export function asegurarVehiculoPorPatente(
  cliente: ClienteTransaccion,
  datos: DatosVehiculo,
) {
  return cliente.vehiculo.upsert({
    where: { patente: datos.patente },
    update: datos,
    create: datos,
  });
}
