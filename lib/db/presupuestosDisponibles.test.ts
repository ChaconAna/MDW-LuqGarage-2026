import { beforeEach, expect, it, vi } from "vitest";
const d = vi.hoisted(() => ({ listar: vi.fn(), contar: vi.fn(), transaccion: vi.fn() }));
vi.mock("./client", () => ({ prisma: { presupuesto: { findMany: d.listar, count: d.contar }, $transaction: d.transaccion } }));
import { listarPresupuestosAprobadosDisponibles } from "./presupuesto";
beforeEach(() => vi.resetAllMocks());
it("filtra listado y conteo por siniestro, aprobado y sin OT, con orden y paginación", async () => {
  d.transaccion.mockResolvedValue([[{ id: "P11", numeroPresupuesto: "P11" }], 11]);
  expect(await listarPresupuestosAprobadosDisponibles("SIN", 2, 10)).toEqual({ presupuestos: [{ id: "P11", numeroPresupuesto: "P11" }], total: 11 });
  const where = { siniestroId: "SIN", estado: "APROBADO", ordenTrabajoId: null };
  expect(d.listar).toHaveBeenCalledExactlyOnceWith({ where, skip: 10, take: 10, orderBy: { id: "asc" }, select: { id: true, numeroPresupuesto: true } });
  expect(d.contar).toHaveBeenCalledExactlyOnceWith({ where });
});
