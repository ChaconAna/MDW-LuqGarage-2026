import { describe, expect, it } from "vitest";

import {
  crearOrdenTrabajoSchema,
  listadoOrdenesTrabajoQuerySchema,
  parametrosOrdenTrabajoSchema,
} from "./ordenTrabajo";

const siniestroId = "40000000-0000-4000-8000-000000000001";
const presupuestoId1 = "40000000-0000-4000-8000-000000000002";
const presupuestoId2 = "40000000-0000-4000-8000-000000000003";

describe("parametrosOrdenTrabajoSchema", () => {
  it("acepta un UUID válido", () => {
    expect(
      parametrosOrdenTrabajoSchema.safeParse({
        id: "40000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });

  it.each(["no-es-un-uuid", "", "123"])("rechaza el id %j", (id) => {
    expect(parametrosOrdenTrabajoSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("listadoOrdenesTrabajoQuerySchema", () => {
  it("aplica los valores por defecto a una query vacía", () => {
    expect(listadoOrdenesTrabajoQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
    });
  });

  it("convierte strings numéricos válidos", () => {
    expect(
      listadoOrdenesTrabajoQuerySchema.parse({ page: "2", limit: "25" }),
    ).toEqual({ page: 2, limit: 25 });
  });

  it.each([
    ["cero", "0"],
    ["negativo", "-1"],
    ["decimal", "1.5"],
    ["no numérico", "abc"],
  ])("rechaza page %s", (_caso, page) => {
    expect(
      listadoOrdenesTrabajoQuerySchema.safeParse({ page }).success,
    ).toBe(false);
  });

  it.each([
    ["cero", "0"],
    ["superior a 100", "101"],
    ["decimal", "1.5"],
    ["no numérico", "abc"],
  ])("rechaza limit %s", (_caso, limit) => {
    expect(
      listadoOrdenesTrabajoQuerySchema.safeParse({ limit }).success,
    ).toBe(false);
  });

  it.each(["1", "100"])("acepta limit en el borde %s", (limit) => {
    expect(
      listadoOrdenesTrabajoQuerySchema.safeParse({ limit }).success,
    ).toBe(true);
  });
});

describe("crearOrdenTrabajoSchema", () => {
  it("acepta un Presupuesto", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: [presupuestoId1],
      }).success,
    ).toBe(true);
  });

  it("acepta varios Presupuestos", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: [presupuestoId1, presupuestoId2],
      }).success,
    ).toBe(true);
  });

  it("rechaza un siniestroId inválido", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId: "no-es-un-uuid",
        presupuestoIds: [presupuestoId1],
      }).success,
    ).toBe(false);
  });

  it("rechaza un presupuestoId inválido", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: ["no-es-un-uuid"],
      }).success,
    ).toBe(false);
  });

  it("rechaza presupuestoIds ausente", () => {
    expect(crearOrdenTrabajoSchema.safeParse({ siniestroId }).success).toBe(
      false,
    );
  });

  it("rechaza presupuestoIds vacío", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: [],
      }).success,
    ).toBe(false);
  });

  it("rechaza IDs repetidos", () => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: [presupuestoId1, presupuestoId1],
      }).success,
    ).toBe(false);
  });

  it.each([
    ["campo desconocido", { numeroOrden: "OT-001" }],
    ["estado", { estado: "BORRADOR" }],
    [
      "Sectores y observaciones",
      { sectores: [{ sectorId: presupuestoId2, observacion: null }] },
    ],
    ["tareas", { tareas: [] }],
  ])("rechaza %s", (_caso, campoAdicional) => {
    expect(
      crearOrdenTrabajoSchema.safeParse({
        siniestroId,
        presupuestoIds: [presupuestoId1],
        ...campoAdicional,
      }).success,
    ).toBe(false);
  });
});
