import type { EstadoPresupuesto } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

type DatosPresupuesto = {
  numeroPresupuesto: string;
  estado: EstadoPresupuesto;
  siniestroId: string;
  ordenTrabajoId: string | null;
};

export function asegurarPresupuestoPorNumero(
  cliente: ClienteTransaccion,
  datos: DatosPresupuesto,
) {
  return cliente.presupuesto.upsert({
    where: { numeroPresupuesto: datos.numeroPresupuesto },
    update: datos,
    create: datos,
  });
}
