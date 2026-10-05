import { describe, expect, it } from "vitest";

import {
  listadoOrdenesTrabajoQuerySchema,
  parametrosOrdenTrabajoSchema,
} from "./ordenTrabajo";

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
