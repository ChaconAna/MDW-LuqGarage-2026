import { describe, expect, it } from "vitest";

import { esFechaSiniestroValida } from "./siniestro";

describe("esFechaSiniestroValida", () => {
  it("acepta una fecha de Siniestro anterior a la fecha de registro", () => {
    const fechaSiniestro = new Date("2026-03-01T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(true);
  });

  it("rechaza una fecha de Siniestro posterior a la fecha de registro", () => {
    const fechaSiniestro = new Date("2026-03-03T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(false);
  });

  it("acepta fechas de Siniestro y registro exactamente iguales", () => {
    const fechaSiniestro = new Date("2026-03-02T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(true);
  });
});
