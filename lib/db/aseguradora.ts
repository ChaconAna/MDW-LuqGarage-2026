import type { ClienteTransaccion } from "./transaccion";

type DatosAseguradora = {
  nombre: string;
  cuit: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
};

export function asegurarAseguradoraPorCuit(
  cliente: ClienteTransaccion,
  datos: DatosAseguradora,
) {
  return cliente.aseguradora.upsert({
    where: { cuit: datos.cuit },
    update: datos,
    create: datos,
  });
}
