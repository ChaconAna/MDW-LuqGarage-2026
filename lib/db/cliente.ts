import type { ClienteTransaccion } from "./transaccion";

type DatosCliente = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
  localidadId: string;
};

export function asegurarClientePorDni(
  cliente: ClienteTransaccion,
  datos: DatosCliente,
) {
  return cliente.cliente.upsert({
    where: { dni: datos.dni },
    update: datos,
    create: datos,
  });
}
