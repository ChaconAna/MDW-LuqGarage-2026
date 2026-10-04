import type { EstadoOrdenTrabajo } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

type DatosOrdenTrabajo = {
  id: string;
  estado: EstadoOrdenTrabajo;
  siniestroId: string;
};

export function asegurarOrdenTrabajoPorId(
  cliente: ClienteTransaccion,
  datos: DatosOrdenTrabajo,
) {
  return cliente.ordenDeTrabajo.upsert({
    where: { id: datos.id },
    update: datos,
    create: datos,
  });
}
