import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  listar: vi.fn(),
  contar: vi.fn(),
  transaccion: vi.fn(),
}));

vi.mock("./client", () => ({
  prisma: {
    localidad: {
      findMany: dependencias.listar,
      count: dependencias.contar,
    },
    $transaction: dependencias.transaccion,
  },
}));

import { listarLocalidades } from "./localidad";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listarLocalidades", () => {
  it("pagina, cuenta e incluye la Provincia de cada Localidad", async () => {
    const localidades = [
      {
        id: "localidad-11",
        nombre: "San Martín",
        provincia: { id: "provincia-1", nombre: "Buenos Aires" },
      },
    ];
    dependencias.transaccion.mockResolvedValue([localidades, 11]);

    await expect(listarLocalidades(2, 10)).resolves.toEqual({
      localidades,
      total: 11,
    });
    expect(dependencias.listar).toHaveBeenCalledExactlyOnceWith({
      skip: 10,
      take: 10,
      orderBy: { id: "asc" },
      select: {
        id: true,
        nombre: true,
        provincia: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
    expect(dependencias.contar).toHaveBeenCalledExactlyOnceWith();
    expect(dependencias.transaccion).toHaveBeenCalledOnce();
  });

  it("conserva localidades homónimas de Provincias diferentes", async () => {
    const localidades = [
      {
        id: "localidad-1",
        nombre: "San Martín",
        provincia: { id: "provincia-1", nombre: "Buenos Aires" },
      },
      {
        id: "localidad-2",
        nombre: "San Martín",
        provincia: { id: "provincia-2", nombre: "Mendoza" },
      },
    ];
    dependencias.transaccion.mockResolvedValue([localidades, 2]);

    const resultado = await listarLocalidades(1, 10);

    expect(resultado.localidades).toEqual(localidades);
    expect(resultado.localidades[0]?.provincia).not.toEqual(
      resultado.localidades[1]?.provincia,
    );
  });

  it("busca por Localidad o Provincia sin perder paginación ni conteo", async () => {
    dependencias.transaccion.mockResolvedValue([[], 0]);

    await listarLocalidades(3, 5, "  san martín  ");

    const where = {
      OR: [
        { nombre: { contains: "san martín", mode: "insensitive" } },
        {
          provincia: {
            nombre: { contains: "san martín", mode: "insensitive" },
          },
        },
      ],
    };
    expect(dependencias.listar).toHaveBeenCalledExactlyOnceWith({
      where,
      skip: 10,
      take: 5,
      orderBy: { id: "asc" },
      select: {
        id: true,
        nombre: true,
        provincia: { select: { id: true, nombre: true } },
      },
    });
    expect(dependencias.contar).toHaveBeenCalledExactlyOnceWith({ where });
  });
});
