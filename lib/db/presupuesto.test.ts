import { beforeEach, describe, expect, it, vi } from "vitest";

const presupuestoPrisma = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("./client", () => ({
  prisma: {
    presupuesto: presupuestoPrisma,
  },
}));

import {
  aprobarPresupuestoPorId,
  enviarPresupuestoPorId,
  rechazarPresupuestoPorId,
} from "./presupuesto";

const presupuestoId = "10000000-0000-4000-8000-000000000001";

const presupuestoEnviado = {
  id: presupuestoId,
  numeroPresupuesto: "PRE-2026-0001",
  estado: "ENVIADO",
  siniestro: {
    id: "20000000-0000-4000-8000-000000000002",
    numeroSiniestro: "SIN-2026-0001",
  },
  reparaciones: [],
  repuestos: [],
};

const presupuestoAprobado = {
  ...presupuestoEnviado,
  estado: "APROBADO",
};

const presupuestoRechazado = {
  ...presupuestoEnviado,
  estado: "RECHAZADO",
};

describe("enviarPresupuestoPorId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cambia de BORRADOR a ENVIADO mediante una actualización condicionada", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 1 });
    presupuestoPrisma.findUniqueOrThrow.mockResolvedValue(presupuestoEnviado);

    await expect(enviarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      enviado: true,
      presupuesto: presupuestoEnviado,
    });

    expect(presupuestoPrisma.updateMany).toHaveBeenCalledWith({
      where: {
        id: presupuestoId,
        estado: "BORRADOR",
      },
      data: { estado: "ENVIADO" },
    });
    expect(presupuestoPrisma.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: presupuestoId } }),
    );
  });

  it("informa que el Presupuesto no existe cuando la transición no afecta filas", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
    presupuestoPrisma.findUnique.mockResolvedValue(null);

    await expect(enviarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      enviado: false,
      motivo: "PRESUPUESTO_NO_ENCONTRADO",
    });

    expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it.each(["ENVIADO", "APROBADO", "RECHAZADO"])(
    "rechaza el estado de origen %s cuando la transición no afecta filas",
    async (estado) => {
      presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
      presupuestoPrisma.findUnique.mockResolvedValue({ estado });

      await expect(enviarPresupuestoPorId(presupuestoId)).resolves.toEqual({
        enviado: false,
        motivo: "PRESUPUESTO_NO_ENVIABLE",
      });

      expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it("propaga una excepción inesperada de persistencia", async () => {
    const error = new Error("Base de datos no disponible");
    presupuestoPrisma.updateMany.mockRejectedValue(error);

    await expect(enviarPresupuestoPorId(presupuestoId)).rejects.toThrow(error);
  });
});

describe("aprobarPresupuestoPorId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cambia de ENVIADO a APROBADO mediante una actualización condicionada", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 1 });
    presupuestoPrisma.findUniqueOrThrow.mockResolvedValue(presupuestoAprobado);

    await expect(aprobarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      aprobado: true,
      presupuesto: presupuestoAprobado,
    });

    expect(presupuestoPrisma.updateMany).toHaveBeenCalledWith({
      where: {
        id: presupuestoId,
        estado: "ENVIADO",
      },
      data: { estado: "APROBADO" },
    });
    expect(presupuestoPrisma.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: presupuestoId } }),
    );
  });

  it("informa que el Presupuesto no existe cuando la transición no afecta filas", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
    presupuestoPrisma.findUnique.mockResolvedValue(null);

    await expect(aprobarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      aprobado: false,
      motivo: "PRESUPUESTO_NO_ENCONTRADO",
    });

    expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it.each(["BORRADOR", "APROBADO", "RECHAZADO"])(
    "rechaza el estado de origen %s cuando la transición no afecta filas",
    async (estado) => {
      presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
      presupuestoPrisma.findUnique.mockResolvedValue({ estado });

      await expect(aprobarPresupuestoPorId(presupuestoId)).resolves.toEqual({
        aprobado: false,
        motivo: "PRESUPUESTO_NO_APROBABLE",
      });

      expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it("propaga una excepción inesperada de persistencia", async () => {
    const error = new Error("Base de datos no disponible");
    presupuestoPrisma.updateMany.mockRejectedValue(error);

    await expect(aprobarPresupuestoPorId(presupuestoId)).rejects.toThrow(error);
  });
});

describe("rechazarPresupuestoPorId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cambia de ENVIADO a RECHAZADO mediante una actualización condicionada", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 1 });
    presupuestoPrisma.findUniqueOrThrow.mockResolvedValue(presupuestoRechazado);

    await expect(rechazarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      rechazado: true,
      presupuesto: presupuestoRechazado,
    });

    expect(presupuestoPrisma.updateMany).toHaveBeenCalledWith({
      where: {
        id: presupuestoId,
        estado: "ENVIADO",
      },
      data: { estado: "RECHAZADO" },
    });
    expect(presupuestoPrisma.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: presupuestoId } }),
    );
  });

  it("informa que el Presupuesto no existe cuando la transición no afecta filas", async () => {
    presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
    presupuestoPrisma.findUnique.mockResolvedValue(null);

    await expect(rechazarPresupuestoPorId(presupuestoId)).resolves.toEqual({
      rechazado: false,
      motivo: "PRESUPUESTO_NO_ENCONTRADO",
    });

    expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it.each(["BORRADOR", "APROBADO", "RECHAZADO"])(
    "rechaza el estado de origen %s cuando la transición no afecta filas",
    async (estado) => {
      presupuestoPrisma.updateMany.mockResolvedValue({ count: 0 });
      presupuestoPrisma.findUnique.mockResolvedValue({ estado });

      await expect(rechazarPresupuestoPorId(presupuestoId)).resolves.toEqual({
        rechazado: false,
        motivo: "PRESUPUESTO_NO_RECHAZABLE",
      });

      expect(presupuestoPrisma.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it("propaga una excepción inesperada de persistencia", async () => {
    const error = new Error("Base de datos no disponible");
    presupuestoPrisma.updateMany.mockRejectedValue(error);

    await expect(rechazarPresupuestoPorId(presupuestoId)).rejects.toThrow(
      error,
    );
  });
});
