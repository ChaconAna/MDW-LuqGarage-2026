import { Prisma } from "@prisma/client";
import { beforeEach, expect, it, vi } from "vitest";

const actualizar = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ prisma: { vehiculo: { update: actualizar } } }));
import { actualizarVehiculoPorId } from "./vehiculo";

const datos = { patente: "AA123BB", modeloId: "modelo", tipoVehiculoId: "tipo" };
beforeEach(() => { vi.resetAllMocks(); });

it.each([true, false])("conserva activo=%s al actualizar los datos", async (activo) => {
  actualizar.mockImplementation(async ({ data }) => ({ id: "vehiculo", activo, ...data }));
  expect(await actualizarVehiculoPorId("vehiculo", datos)).toMatchObject({ actualizado: true, vehiculo: { activo, ...datos } });
  expect(actualizar.mock.calls[0]?.[0]).toMatchObject({ where: { id: "vehiculo" }, data: datos });
  expect(actualizar.mock.calls[0]?.[0].data).not.toHaveProperty("activo");
});

it.each([
  ["P2002", "PATENTE_DUPLICADA"],
  ["P2003", "MODELO_O_TIPO_VEHICULO_NO_ENCONTRADO"],
  ["P2025", "VEHICULO_NO_ENCONTRADO"],
])("traduce %s para la edición", async (code, motivo) => {
  actualizar.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Error simulado", { code, clientVersion: "test" }));
  expect(await actualizarVehiculoPorId("vehiculo", datos)).toEqual({ actualizado: false, motivo });
});
