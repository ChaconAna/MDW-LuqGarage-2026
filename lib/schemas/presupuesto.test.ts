import { describe, expect, it } from "vitest";

import { crearPresupuestoSchema } from "./presupuesto";

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
