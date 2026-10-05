import { Prisma, type EstadoPresupuesto } from "@prisma/client";

import type { DetallePresupuesto } from "../db/presupuesto";

export function puedeEditarPresupuesto(estado: EstadoPresupuesto): boolean {
  return estado === "BORRADOR";
}

export function calcularTotalPresupuesto(
  costos: readonly Prisma.Decimal[],
): string {
  const total = costos.reduce(
    (acumulado, costo) => acumulado.plus(costo),
    new Prisma.Decimal(0),
  );

  return total.toFixed(2);
}

export function serializarDetallePresupuesto(
  presupuesto: DetallePresupuesto,
) {
  const total = calcularTotalPresupuesto(
    presupuesto.reparaciones.map(({ costo }) => costo),
  );

  return {
    ...presupuesto,
    reparaciones: presupuesto.reparaciones.map(({ costo, ...detalle }) => ({
      ...detalle,
      costo: costo.toFixed(2),
    })),
    total,
  };
}
