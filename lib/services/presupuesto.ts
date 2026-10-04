import { Prisma } from "@prisma/client";

export function calcularTotalPresupuesto(
  costos: readonly Prisma.Decimal[],
): string {
  const total = costos.reduce(
    (acumulado, costo) => acumulado.plus(costo),
    new Prisma.Decimal(0),
  );

  return total.toFixed(2);
}
