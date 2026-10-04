import type { EstadoSiniestro, GradoDano } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

type DatosSiniestro = {
  numeroSiniestro: string;
  fechaSiniestro: Date;
  fechaRegistro: Date;
  gradoDano: GradoDano;
  numeroPoliza: string;
  estado: EstadoSiniestro;
  clienteId: string;
  vehiculoId: string;
  aseguradoraId: string;
};

export function asegurarSiniestroPorNumero(
  cliente: ClienteTransaccion,
  datos: DatosSiniestro,
) {
  return cliente.siniestro.upsert({
    where: { numeroSiniestro: datos.numeroSiniestro },
    update: datos,
    create: datos,
  });
}
