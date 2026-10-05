import { describe, expect, it } from "vitest";

import {
  actualizarPresupuestoSchema,
  crearPresupuestoSchema,
} from "./presupuesto";

const siniestroId = "10000000-0000-4000-8000-000000000001";
const reparacionId = "20000000-0000-4000-8000-000000000001";
const otraReparacionId = "20000000-0000-4000-8000-000000000002";
const repuestoId = "30000000-0000-4000-8000-000000000001";

function crearBodyValido() {
  return {
    numeroPresupuesto: "PRES-TEST-001",
    siniestroId,
    reparaciones: [{ reparacionId, costo: "150000.00" }],
    repuestos: [{ repuestoId, cantidad: 2 }],
  };
}

describe("crearPresupuestoSchema", () => {
  it("acepta una reparación con costo cero", () => {
    const body = crearBodyValido();
    body.reparaciones[0]!.costo = "0.00";

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(true);
  });

  it("acepta el costo máximo de Decimal(12,2)", () => {
    const body = crearBodyValido();
    body.reparaciones[0]!.costo = "9999999999.99";

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(true);
  });

  it("normaliza repuestos omitidos a una colección vacía", () => {
    const body = crearBodyValido();
    const resultado = crearPresupuestoSchema.parse({
      numeroPresupuesto: body.numeroPresupuesto,
      siniestroId: body.siniestroId,
      reparaciones: body.reparaciones,
    });

    expect(resultado.repuestos).toEqual([]);
  });

  it("rechaza un Presupuesto sin reparaciones", () => {
    const body = { ...crearBodyValido(), reparaciones: [] };

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
  });

  it("rechaza una Reparación duplicada", () => {
    const body = crearBodyValido();
    body.reparaciones.push({ reparacionId, costo: "200000.00" });

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
  });

  it("acepta Reparaciones diferentes", () => {
    const body = crearBodyValido();
    body.reparaciones.push({
      reparacionId: otraReparacionId,
      costo: "200000.00",
    });

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(true);
  });

  it("rechaza un Repuesto duplicado", () => {
    const body = crearBodyValido();
    body.repuestos.push({ repuestoId, cantidad: 1 });

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
  });

  it.each([0, -1, 1.5, 2_147_483_648])(
    "rechaza la cantidad inválida %s",
    (cantidad) => {
      const body = crearBodyValido();
      body.repuestos[0]!.cantidad = cantidad;

      expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
    },
  );

  it.each([
    "-0.01",
    "1",
    "1.2",
    "1.234",
    "10000000000.00",
  ])("rechaza el costo inválido %s", (costo) => {
    const body = crearBodyValido();
    body.reparaciones[0]!.costo = costo;

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
  });

  it("rechaza un costo enviado como number", () => {
    const body = {
      ...crearBodyValido(),
      reparaciones: [{ reparacionId, costo: 150000 }],
    };

    expect(crearPresupuestoSchema.safeParse(body).success).toBe(false);
  });
});

describe("actualizarPresupuestoSchema", () => {
  it("acepta modificar sólo Reparaciones", () => {
    const resultado = actualizarPresupuestoSchema.parse({
      reparaciones: [{ reparacionId, costo: "200000.00" }],
    });

    expect(resultado.reparaciones).toHaveLength(1);
    expect(resultado.repuestos).toBeUndefined();
  });

  it("acepta modificar sólo Repuestos", () => {
    const resultado = actualizarPresupuestoSchema.parse({
      repuestos: [{ repuestoId, cantidad: 3 }],
    });

    expect(resultado.reparaciones).toBeUndefined();
    expect(resultado.repuestos).toHaveLength(1);
  });

  it("acepta modificar ambas colecciones", () => {
    const resultado = actualizarPresupuestoSchema.safeParse({
      reparaciones: [{ reparacionId, costo: "200000.00" }],
      repuestos: [{ repuestoId, cantidad: 3 }],
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un body vacío", () => {
    expect(actualizarPresupuestoSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza una colección vacía de Reparaciones", () => {
    expect(
      actualizarPresupuestoSchema.safeParse({ reparaciones: [] }).success,
    ).toBe(false);
  });

  it("acepta una colección vacía de Repuestos", () => {
    const resultado = actualizarPresupuestoSchema.parse({ repuestos: [] });

    expect(resultado.repuestos).toEqual([]);
    expect(resultado.reparaciones).toBeUndefined();
  });

  it.each([
    ["numeroPresupuesto", "PRES-TEST-002"],
    ["siniestroId", siniestroId],
    ["id", "40000000-0000-4000-8000-000000000001"],
    ["estado", "BORRADOR"],
    ["ordenTrabajoId", null],
    ["total", "200000.00"],
  ])("rechaza el campo no editable %s", (campo, valor) => {
    expect(
      actualizarPresupuestoSchema.safeParse({
        repuestos: [],
        [campo]: valor,
      }).success,
    ).toBe(false);
  });

  it("rechaza campos adicionales", () => {
    expect(
      actualizarPresupuestoSchema.safeParse({
        repuestos: [],
        campoAdicional: true,
      }).success,
    ).toBe(false);
  });

  it("rechaza IDs de detalles", () => {
    expect(
      actualizarPresupuestoSchema.safeParse({
        reparaciones: [
          {
            id: "40000000-0000-4000-8000-000000000001",
            reparacionId,
            costo: "200000.00",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rechaza una Reparación duplicada", () => {
    expect(
      actualizarPresupuestoSchema.safeParse({
        reparaciones: [
          { reparacionId, costo: "100000.00" },
          { reparacionId, costo: "200000.00" },
        ],
      }).success,
    ).toBe(false);
  });

  it("rechaza un Repuesto duplicado", () => {
    expect(
      actualizarPresupuestoSchema.safeParse({
        repuestos: [
          { repuestoId, cantidad: 1 },
          { repuestoId, cantidad: 2 },
        ],
      }).success,
    ).toBe(false);
  });

  it.each(["-0.01", "1", "1.2", "1.234", "10000000000.00"])(
    "rechaza el costo inválido %s",
    (costo) => {
      expect(
        actualizarPresupuestoSchema.safeParse({
          reparaciones: [{ reparacionId, costo }],
        }).success,
      ).toBe(false);
    },
  );

  it.each([0, -1, 1.5, 2_147_483_648])(
    "rechaza la cantidad inválida %s",
    (cantidad) => {
      expect(
        actualizarPresupuestoSchema.safeParse({
          repuestos: [{ repuestoId, cantidad }],
        }).success,
      ).toBe(false);
    },
  );
});
