import { beforeEach, describe, expect, it, vi } from "vitest";

const ordenDeTrabajoPrisma = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
}));
const transaccionPrisma = vi.hoisted(() => vi.fn());

vi.mock("./client", () => ({
  prisma: {
    $transaction: transaccionPrisma,
    ordenDeTrabajo: ordenDeTrabajoPrisma,
  },
}));

import {
  listarOrdenesTrabajo,
  listarOrdenesTrabajoFinalizadas,
  obtenerOrdenTrabajoFinalizadaPorId,
  obtenerOrdenTrabajoPorId,
} from "./ordenTrabajo";

describe("consultas de Orden de Trabajo", () => {
  beforeEach(() => {
    ordenDeTrabajoPrisma.count.mockReset();
    ordenDeTrabajoPrisma.findFirst.mockReset();
    ordenDeTrabajoPrisma.findMany.mockReset();
    ordenDeTrabajoPrisma.findUnique.mockReset();
    transaccionPrisma.mockReset();
  });

  it("mantiene el listado existente sin filtro de estado", async () => {
    ordenDeTrabajoPrisma.findMany.mockReturnValue("listado");
    ordenDeTrabajoPrisma.count.mockReturnValue("total");
    transaccionPrisma.mockResolvedValue([[], 0]);

    await expect(listarOrdenesTrabajo(2, 10)).resolves.toEqual({
      ordenesTrabajo: [],
      total: 0,
    });

    expect(ordenDeTrabajoPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { id: "asc" },
      }),
    );
    expect(ordenDeTrabajoPrisma.count).toHaveBeenCalledWith();
  });

  it("lista solo Órdenes de Trabajo FINALIZADA y cuenta con el mismo filtro", async () => {
    ordenDeTrabajoPrisma.findMany.mockReturnValue("listado-finalizado");
    ordenDeTrabajoPrisma.count.mockReturnValue("total-finalizado");
    transaccionPrisma.mockResolvedValue([[], 0]);

    await expect(listarOrdenesTrabajoFinalizadas(2, 10)).resolves.toEqual({
      ordenesTrabajo: [],
      total: 0,
    });

    expect(ordenDeTrabajoPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { estado: "FINALIZADA" },
        skip: 10,
        take: 10,
        orderBy: { id: "asc" },
      }),
    );
    expect(ordenDeTrabajoPrisma.count).toHaveBeenCalledWith({
      where: { estado: "FINALIZADA" },
    });
  });

  it("mantiene el detalle existente consultando únicamente por id", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    ordenDeTrabajoPrisma.findUnique.mockReturnValue("detalle");

    obtenerOrdenTrabajoPorId(id);

    expect(ordenDeTrabajoPrisma.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id } }),
    );
  });

  it("obtiene el detalle solo si la Orden de Trabajo está FINALIZADA", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    ordenDeTrabajoPrisma.findFirst.mockReturnValue("detalle-finalizado");

    obtenerOrdenTrabajoFinalizadaPorId(id);

    expect(ordenDeTrabajoPrisma.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id,
          estado: "FINALIZADA",
        },
      }),
    );
  });
});
