import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  actualizar: vi.fn(), listar: vi.fn(), contar: vi.fn(), transaccion: vi.fn(), obtener: vi.fn(),
}));
vi.mock("./client", () => ({ prisma: {
  vehiculo: { updateMany: deps.actualizar, findMany: deps.listar, count: deps.contar, findUnique: deps.obtener },
  $transaction: deps.transaccion,
} }));

import { darDeBajaVehiculoPorId, listarVehiculos, listarVehiculosActivos, obtenerVehiculoPorId } from "./vehiculo";

const siniestroDeps = vi.hoisted(() => ({
  cliente: { findUnique: vi.fn() }, vehiculo: { findUnique: vi.fn() },
  aseguradora: { findUnique: vi.fn() }, siniestro: { create: vi.fn() },
}));
vi.mock("./transaccion", () => ({
  ejecutarTransaccion: (operacion: (cliente: typeof siniestroDeps) => unknown) => operacion(siniestroDeps),
}));
import { crearSiniestro } from "./siniestro";

beforeEach(() => { vi.resetAllMocks(); });

it("rechaza en servidor un vehículo dado de baja aunque un formulario anterior conserve su ID", async () => {
  siniestroDeps.cliente.findUnique.mockResolvedValue({ activo: true });
  siniestroDeps.vehiculo.findUnique.mockResolvedValue({ activo: false });
  siniestroDeps.aseguradora.findUnique.mockResolvedValue({ activo: true });
  const fecha = new Date("2026-01-01T00:00:00Z");
  expect(await crearSiniestro({
    numeroSiniestro: "S-1", numeroPoliza: "P-1", fechaSiniestro: fecha,
    gradoDano: "LEVE", clienteId: "cliente", vehiculoId: "vehiculo", aseguradoraId: "aseguradora", documentos: [],
  }, fecha)).toEqual({ creado: false, motivo: "VEHICULO_INACTIVO" });
  expect(siniestroDeps.siniestro.create).not.toHaveBeenCalled();
});

describe("baja lógica de Vehiculo", () => {
  it("cambia únicamente activo y condiciona la escritura al estado activo", async () => {
    deps.actualizar.mockResolvedValue({ count: 1 });
    expect(await darDeBajaVehiculoPorId("id", { soloSiActivo: true })).toBe(true);
    expect(deps.actualizar).toHaveBeenCalledExactlyOnceWith({
      where: { id: "id", activo: true }, data: { activo: false },
    });
  });

  it("informa cuando no se modificó ningún registro", async () => {
    deps.actualizar.mockResolvedValue({ count: 0 });
    expect(await darDeBajaVehiculoPorId("id", { soloSiActivo: true })).toBe(false);
  });

  it("conserva el contrato usado por el endpoint existente", async () => {
    deps.actualizar.mockResolvedValue({ count: 1 });
    expect(await darDeBajaVehiculoPorId("id")).toBe(true);
    expect(deps.actualizar).toHaveBeenCalledWith({ where: { id: "id" }, data: { activo: false } });
  });

  it("dos solicitudes concurrentes solo dan de baja una vez y conservan el registro", async () => {
    const vehiculo = { id: "id", activo: true, patente: "AA123BB", siniestros: ["siniestro-histórico"] };
    deps.actualizar.mockImplementation(async ({ where, data }: {
      where: { id: string; activo?: boolean }; data: { activo: boolean };
    }) => {
      if (where.id !== vehiculo.id || where.activo !== vehiculo.activo) return { count: 0 };
      Object.assign(vehiculo, data);
      return { count: 1 };
    });
    expect(await Promise.all([
      darDeBajaVehiculoPorId("id", { soloSiActivo: true }),
      darDeBajaVehiculoPorId("id", { soloSiActivo: true }),
    ])).toEqual([true, false]);
    expect(vehiculo).toEqual({ id: "id", activo: false, patente: "AA123BB", siniestros: ["siniestro-histórico"] });
  });

  it("conserva inactivos en listado y detalle, pero los excluye del selector para nuevas operaciones", async () => {
    const vehiculo = { id: "id", activo: false };
    deps.transaccion.mockResolvedValueOnce([[vehiculo], 1]).mockResolvedValueOnce([[], 0]);
    deps.obtener.mockResolvedValue(vehiculo);
    expect((await listarVehiculos(1, 10)).vehiculos).toEqual([vehiculo]);
    expect(deps.listar.mock.calls[0]?.[0]).not.toHaveProperty("where");
    expect(await obtenerVehiculoPorId("id")).toEqual(vehiculo);
    expect(deps.obtener).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "id" } }));
    expect((await listarVehiculosActivos(1, 10)).vehiculos).toEqual([]);
    expect(deps.listar.mock.calls[1]?.[0]).toMatchObject({ where: { activo: true }, take: 10 });
  });
});
