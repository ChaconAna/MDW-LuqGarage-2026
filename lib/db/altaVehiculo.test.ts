import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => {
  const catalogo = () => ({ findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() });
  return { marca: catalogo(), modelo: catalogo(), tipoVehiculo: catalogo(), crear: vi.fn(), transaccion: vi.fn() };
});
vi.mock("./client", () => ({ prisma: {
  marca: deps.marca, modelo: deps.modelo, tipoVehiculo: deps.tipoVehiculo,
  vehiculo: { create: deps.crear }, $transaction: deps.transaccion,
} }));

import { listarMarcas } from "./marca";
import { listarModelosPorMarca, obtenerModeloPorId } from "./modelo";
import { listarTiposVehiculo } from "./tipoVehiculo";
import { crearVehiculo } from "./vehiculo";

beforeEach(() => {
  vi.resetAllMocks();
  deps.transaccion.mockResolvedValue([[{ id: "id", nombre: "Nombre" }], 11]);
});

describe("consultas del alta de Vehículos", () => {
  it("pagina Marcas y Tipos con límite explícito y orden estable", async () => {
    for (const [listar, modelo] of [[listarMarcas, deps.marca], [listarTiposVehiculo, deps.tipoVehiculo]] as const) {
      expect(await listar(2, 10)).toMatchObject({ total: 11 });
      expect(modelo.findMany).toHaveBeenCalledExactlyOnceWith({ skip: 10, take: 10, orderBy: { id: "asc" }, select: { id: true, nombre: true } });
      expect(modelo.count).toHaveBeenCalledExactlyOnceWith();
    }
  });
  it("filtra tanto filas como total de Modelos por Marca", async () => {
    await listarModelosPorMarca("marca", 2, 10);
    expect(deps.modelo.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { marcaId: "marca" }, skip: 10, take: 10, orderBy: { id: "asc" }, select: { id: true, nombre: true },
    });
    expect(deps.modelo.count).toHaveBeenCalledExactlyOnceWith({ where: { marcaId: "marca" } });
  });
  it("consulta la Marca real de un Modelo", async () => {
    await obtenerModeloPorId("modelo");
    expect(deps.modelo.findUnique).toHaveBeenCalledWith({ where: { id: "modelo" }, select: { id: true, marcaId: true } });
  });
  it("reutiliza la persistencia con activo=true y solo las relaciones existentes", async () => {
    deps.crear.mockResolvedValue({ id: "vehiculo", activo: true });
    const datos = { patente: "AA123BB", modeloId: "modelo", tipoVehiculoId: "tipo" };
    expect(await crearVehiculo(datos)).toMatchObject({ creado: true, vehiculo: { activo: true } });
    expect(deps.crear.mock.calls[0]?.[0].data).toEqual({ ...datos, activo: true });
  });
  it.each([
    ["P2002", "PATENTE_DUPLICADA"], ["P2003", "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO"],
  ])("preserva el manejo de %s", async (code, motivo) => {
    deps.crear.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Error simulado", { code, clientVersion: "test" }));
    expect(await crearVehiculo({ patente: "AA123BB", modeloId: "modelo", tipoVehiculoId: "tipo" })).toEqual({ creado: false, motivo });
  });
});
