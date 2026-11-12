import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({
  presupuesto: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  siniestro: { findUnique: vi.fn(), updateMany: vi.fn() },
  reparacion: { findMany: vi.fn(), count: vi.fn() },
  repuesto: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("./client", () => ({ prisma: {
  ...d,
  $transaction: (operacion: unknown) => Array.isArray(operacion)
    ? Promise.all(operacion)
    : typeof operacion === "function" ? operacion(d) : Promise.reject(new Error("Transacción simulada inválida")),
} }));

import { crearPresupuesto, actualizarPresupuestoPorId, listarPresupuestosPorSiniestro } from "./presupuesto";
import { listarReparaciones } from "./reparacion";
import { listarRepuestos } from "./repuesto";

const id = "10000000-0000-4000-8000-000000000001";
const siniestroId = "20000000-0000-4000-8000-000000000002";
const reparacionId = "30000000-0000-4000-8000-000000000003";
const repuestoId = "40000000-0000-4000-8000-000000000004";
const colecciones = { reparaciones: [{ reparacionId, costo: "0.00" }], repuestos: [{ repuestoId, cantidad: 2 }] };
const alta = { ...colecciones, numeroPresupuesto: "P-1", siniestroId };
const presupuesto = { id, estado: "BORRADOR", siniestro: { id: siniestroId } };

beforeEach(() => {
  vi.resetAllMocks();
  d.siniestro.findUnique.mockResolvedValue({ id: siniestroId });
  d.siniestro.updateMany.mockResolvedValue({ count: 1 });
  d.reparacion.findMany.mockResolvedValue([{ id: reparacionId, nombre: "Reparación" }]);
  d.repuesto.findMany.mockResolvedValue([{ id: repuestoId, nombre: "Repuesto" }]);
  d.reparacion.count.mockResolvedValue(11); d.repuesto.count.mockResolvedValue(11);
  d.presupuesto.findUnique.mockResolvedValue({ estado: "BORRADOR" });
  d.presupuesto.create.mockResolvedValue(presupuesto); d.presupuesto.update.mockResolvedValue(presupuesto);
  d.presupuesto.findMany.mockResolvedValue([presupuesto]); d.presupuesto.count.mockResolvedValue(11);
});

describe("lecturas paginadas para presupuestos", () => {
  it.each(["reparaciones", "repuestos"])("pagina %s con orden estable y campos mínimos", async (tipo) => {
    const listar = tipo === "reparaciones" ? listarReparaciones : listarRepuestos;
    const modelo = tipo === "reparaciones" ? d.reparacion : d.repuesto;
    expect(await listar(2, 10)).toMatchObject({ total: 11 });
    expect(modelo.findMany).toHaveBeenCalledExactlyOnceWith({ skip: 10, take: 10, orderBy: { id: "asc" }, select: { id: true, nombre: true } });
    expect(modelo.count).toHaveBeenCalledExactlyOnceWith();
    expect(d.presupuesto.create).not.toHaveBeenCalled();
  });
  it("aplica el mismo siniestro al listado y al conteo", async () => {
    expect(await listarPresupuestosPorSiniestro(siniestroId, 2, 10)).toMatchObject({ total: 11 });
    expect(d.presupuesto.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siniestroId }, skip: 10, take: 10, orderBy: { id: "asc" } }));
    expect(d.presupuesto.count).toHaveBeenCalledWith({ where: { siniestroId } });
  });
});

describe("persistencia de borradores con Prisma simulado", () => {
  it("crea el agregado BORRADOR y actualiza el siniestro en la misma transacción", async () => {
    expect(await crearPresupuesto(alta)).toEqual({ creado: true, presupuesto });
    expect(d.presupuesto.create).toHaveBeenCalledWith(expect.objectContaining({ data: {
      numeroPresupuesto: "P-1", siniestroId, estado: "BORRADOR",
      reparaciones: { create: colecciones.reparaciones }, repuestos: { create: colecciones.repuestos },
    } }));
    expect(d.siniestro.updateMany).toHaveBeenCalledWith({ where: { id: siniestroId, estado: "REGISTRADO" }, data: { estado: "PRESUPUESTADO" } });
  });
  it("permite otro presupuesto de un siniestro ya presupuestado", async () => {
    d.siniestro.updateMany.mockResolvedValue({ count: 0 });
    expect((await crearPresupuesto(alta)).creado).toBe(true);
  });
  it.each(["siniestro", "reparacion", "repuesto"])("rechaza referencia inexistente: %s sin crear", async (entidad) => {
    if (entidad === "siniestro") d.siniestro.findUnique.mockResolvedValue(null);
    else if (entidad === "reparacion") d.reparacion.findMany.mockResolvedValue([]);
    else d.repuesto.findMany.mockResolvedValue([]);
    expect((await crearPresupuesto(alta)).creado).toBe(false);
    expect(d.presupuesto.create).not.toHaveBeenCalled(); expect(d.siniestro.updateMany).not.toHaveBeenCalled();
  });
  it("traduce el número duplicado", async () => {
    d.presupuesto.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "simulada" }));
    expect(await crearPresupuesto(alta)).toEqual({ creado: false, motivo: "NUMERO_DUPLICADO" });
  });
  it("actualiza las colecciones condicionando la escritura a BORRADOR", async () => {
    d.repuesto.findMany.mockResolvedValue([]);
    expect(await actualizarPresupuestoPorId(id, { ...colecciones, repuestos: [] })).toEqual({ actualizado: true, presupuesto });
    expect(d.presupuesto.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id, estado: "BORRADOR" }, data: {
      reparaciones: { deleteMany: {}, create: colecciones.reparaciones }, repuestos: { deleteMany: {}, create: [] },
    } }));
    expect(d.siniestro.updateMany).not.toHaveBeenCalled();
  });
  it("conserva la colección no enviada", async () => {
    d.repuesto.findMany.mockResolvedValue([]);
    await actualizarPresupuestoPorId(id, { repuestos: [] });
    expect(d.presupuesto.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reparaciones: undefined, repuestos: { deleteMany: {}, create: [] } } }));
  });
  it.each(["ENVIADO", "APROBADO", "RECHAZADO"])("rechaza edición de %s", async (estado) => {
    d.presupuesto.findUnique.mockResolvedValue({ estado });
    expect(await actualizarPresupuestoPorId(id, colecciones)).toEqual({ actualizado: false, motivo: "PRESUPUESTO_NO_EDITABLE" });
    expect(d.presupuesto.update).not.toHaveBeenCalled();
  });
  it("rechaza el presupuesto inexistente", async () => {
    d.presupuesto.findUnique.mockResolvedValue(null);
    expect(await actualizarPresupuestoPorId(id, colecciones)).toEqual({ actualizado: false, motivo: "PRESUPUESTO_NO_ENCONTRADO" });
    expect(d.presupuesto.update).not.toHaveBeenCalled();
  });
  it.each(["reparacion", "repuesto"])("rechaza una referencia inexistente al editar: %s", async (entidad) => {
    (entidad === "reparacion" ? d.reparacion : d.repuesto).findMany.mockResolvedValue([]);
    expect((await actualizarPresupuestoPorId(id, colecciones)).actualizado).toBe(false);
    expect(d.presupuesto.update).not.toHaveBeenCalled();
  });
  it("detecta que el estado cambió entre la lectura y el update", async () => {
    d.presupuesto.findUnique.mockResolvedValueOnce({ estado: "BORRADOR" }).mockResolvedValueOnce({ estado: "ENVIADO" });
    d.presupuesto.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("condición", { code: "P2025", clientVersion: "simulada" }));
    expect(await actualizarPresupuestoPorId(id, colecciones)).toEqual({ actualizado: false, motivo: "PRESUPUESTO_NO_EDITABLE" });
  });
  it("propaga errores inesperados", async () => {
    const error = new Error("falla simulada"); d.presupuesto.create.mockRejectedValue(error);
    await expect(crearPresupuesto(alta)).rejects.toBe(error);
  });
});
