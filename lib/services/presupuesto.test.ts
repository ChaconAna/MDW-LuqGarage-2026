import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { calcularTotalPresupuesto } from "./presupuesto";

describe("calcularTotalPresupuesto", () => {
  it("devuelve cero con dos decimales cuando no hay reparaciones", () => {
    expect(calcularTotalPresupuesto([])).toBe("0.00");
  });

  it("suma los costos sin convertirlos a punto flotante", () => {
    const costos = [
      new Prisma.Decimal("150000.00"),
      new Prisma.Decimal("0.10"),
      new Prisma.Decimal("0.20"),
    ];

    expect(calcularTotalPresupuesto(costos)).toBe("150000.30");
  });
});
