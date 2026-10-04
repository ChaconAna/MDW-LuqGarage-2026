import type { ClienteTransaccion } from "./transaccion";

type DatosDetalleRepuesto = {
  id: string;
  cantidad: number;
  presupuestoId: string;
  repuestoId: string;
};

export function asegurarDetalleRepuesto(
  cliente: ClienteTransaccion,
  datos: DatosDetalleRepuesto,
) {
  return cliente.detalleRepuesto.upsert({
    where: {
      presupuestoId_repuestoId: {
        presupuestoId: datos.presupuestoId,
        repuestoId: datos.repuestoId,
      },
    },
    update: { cantidad: datos.cantidad },
    create: datos,
  });
}
