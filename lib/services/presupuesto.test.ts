import { Prisma, type EstadoPresupuesto } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calcularTotalPresupuesto,
  puedeEditarPresupuesto,
} from "./presupuesto";

describe("puedeEditarPresupuesto", () => {
  it("permite editar un Presupuesto en estado BORRADOR", () => {
    expect(puedeEditarPresupuesto("BORRADOR")).toBe(true);
  });

  it("no permite editar un Presupuesto en estado ENVIADO", () => {
    expect(puedeEditarPresupuesto("ENVIADO")).toBe(false);
  });

  it.each([
    "APROBADO",
    "RECHAZADO",
  ] satisfies EstadoPresupuesto[])(
    "no permite editar un Presupuesto en estado %s",
    (estado) => {
      expect(puedeEditarPresupuesto(estado)).toBe(false);
    },
  );
});

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
