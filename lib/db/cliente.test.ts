import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  actualizar: vi.fn(), listar: vi.fn(), contar: vi.fn(), transaccion: vi.fn(), obtener: vi.fn(),
}));
vi.mock("./client", () => ({ prisma: {
  cliente: { updateMany: deps.actualizar, findMany: deps.listar, count: deps.contar, findUnique: deps.obtener },
  $transaction: deps.transaccion,
} }));

import { darDeBajaClientePorId, listarClientes, listarClientesActivos, obtenerClientePorId } from "./cliente";

beforeEach(() => { vi.resetAllMocks(); });

describe("baja lógica de Cliente", () => {
  it("cambia únicamente activo y condiciona la escritura al estado activo", async () => {
    deps.actualizar.mockResolvedValue({ count: 1 });
    expect(await darDeBajaClientePorId("id", { soloSiActivo: true })).toBe(true);
    expect(deps.actualizar).toHaveBeenCalledExactlyOnceWith({
      where: { id: "id", activo: true }, data: { activo: false },
    });
  });

  it("informa cuando no se modificó ningún registro", async () => {
    deps.actualizar.mockResolvedValue({ count: 0 });
    expect(await darDeBajaClientePorId("id", { soloSiActivo: true })).toBe(false);
  });

  it("conserva el contrato usado por el endpoint existente", async () => {
    deps.actualizar.mockResolvedValue({ count: 1 });
    expect(await darDeBajaClientePorId("id")).toBe(true);
    expect(deps.actualizar).toHaveBeenCalledWith({ where: { id: "id" }, data: { activo: false } });
  });

  it("dos solicitudes concurrentes solo dan de baja una vez y conservan el registro", async () => {
    const cliente = { id: "id", activo: true, nombre: "Ana", siniestros: ["siniestro-histórico"] };
    deps.actualizar.mockImplementation(async ({ where, data }: {
      where: { id: string; activo?: boolean }; data: { activo: boolean };
    }) => {
      if (where.id !== cliente.id || where.activo !== cliente.activo) return { count: 0 };
      Object.assign(cliente, data);
      return { count: 1 };
    });
    expect(await Promise.all([
      darDeBajaClientePorId("id", { soloSiActivo: true }),
      darDeBajaClientePorId("id", { soloSiActivo: true }),
    ])).toEqual([true, false]);
    expect(cliente).toEqual({ id: "id", activo: false, nombre: "Ana", siniestros: ["siniestro-histórico"] });
  });

  it("conserva inactivos en listado y detalle, pero los excluye del selector para nuevas operaciones", async () => {
    const cliente = { id: "id", activo: false };
    deps.transaccion.mockResolvedValueOnce([[cliente], 1]).mockResolvedValueOnce([[], 0]);
    deps.obtener.mockResolvedValue(cliente);
    expect((await listarClientes(1, 10)).clientes).toEqual([cliente]);
    expect(deps.listar.mock.calls[0]?.[0]).not.toHaveProperty("where");
    expect(await obtenerClientePorId("id")).toEqual(cliente);
    expect(deps.obtener).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "id" } }));
    expect((await listarClientesActivos(1, 10)).clientes).toEqual([]);
    expect(deps.listar.mock.calls[1]?.[0]).toMatchObject({ where: { activo: true }, take: 10 });
  });
});
