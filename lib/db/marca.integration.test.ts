import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

import { validarEntornoPruebas } from "../schemas/entornoPruebas";

it("persiste Marca, conserva su identidad y rechaza nombres duplicados en PostgreSQL", async () => {
  if (process.env.PRUEBAS_PERSISTENCIA !== "1") {
    throw new Error("La integración requiere PRUEBAS_PERSISTENCIA=1 y PostgreSQL temporal autorizado en GitHub Actions.");
  }
  validarEntornoPruebas(process.env);

  const { prisma } = await import("./client");
  const nombre = `integracion-marca-${randomUUID()}`;
  const errores: unknown[] = [];

  try {
    const { asegurarMarcaPorNombre } = await import("./marca");
    const creada = await asegurarMarcaPorNombre(prisma, nombre);
    expect(creada.nombre).toBe(nombre);
    expect(creada.id).toEqual(expect.any(String));

    const recuperada = await prisma.marca.findUnique({ where: { nombre } });
    expect(recuperada).toEqual(creada);

    const repetida = await asegurarMarcaPorNombre(prisma, nombre);
    expect(repetida.id).toBe(creada.id);
    expect(await prisma.marca.count({ where: { nombre } })).toBe(1);

    await expect(prisma.marca.create({ data: { nombre } })).rejects.toMatchObject({
      code: "P2002",
    });
  } catch (error: unknown) {
    errores.push(error);
  } finally {
    try {
      // Solo el nombre artificial de esta ejecución, incluso si una comprobación falla.
      await prisma.marca.deleteMany({ where: { nombre } });
      expect(await prisma.marca.count({ where: { nombre } })).toBe(0);
    } catch (error: unknown) {
      errores.push(error);
    } finally {
      try {
        await prisma.$disconnect();
      } catch (error: unknown) {
        errores.push(error);
      }
    }
  }

  if (errores.length > 0) {
    throw new AggregateError(errores, "Falló la integración de Marca o su limpieza y desconexión.");
  }
});
