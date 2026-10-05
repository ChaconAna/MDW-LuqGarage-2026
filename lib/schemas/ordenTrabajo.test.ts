import { describe, expect, it } from "vitest";

import { listadoOrdenesTrabajoQuerySchema } from "./ordenTrabajo";

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
