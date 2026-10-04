import type { ClienteTransaccion } from "./transaccion";

type DatosDetalleReparacion = {
  id: string;
  costo: string;
  presupuestoId: string;
  reparacionId: string;
};

export function asegurarDetalleReparacion(
  cliente: ClienteTransaccion,
  datos: DatosDetalleReparacion,
) {
  return cliente.detalleReparacion.upsert({
    where: {
      presupuestoId_reparacionId: {
        presupuestoId: datos.presupuestoId,
        reparacionId: datos.reparacionId,
      },
    },
    update: { costo: datos.costo },
    create: datos,
  });
}
