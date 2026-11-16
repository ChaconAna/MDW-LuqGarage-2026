import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => {
  const modelo = () => ({
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  });
  const cliente = {
    cliente: modelo(),
    vehiculo: modelo(),
    aseguradora: modelo(),
    sector: modelo(),
    reparacion: modelo(),
    siniestro: modelo(),
    documentoSiniestro: modelo(),
    presupuesto: modelo(),
    detalleReparacion: modelo(),
    ordenDeTrabajo: modelo(),
    ordenTrabajoSector: modelo(),
  };

  return {
    cliente,
    ejecutarTransaccion: vi.fn(),
    validarEntorno: vi.fn(),
  };
});

vi.mock("../schemas/entornoE2e", () => ({
  validarEntornoAutenticacionE2e: dependencias.validarEntorno,
}));

vi.mock("./transaccion", () => ({
  ejecutarTransaccion: dependencias.ejecutarTransaccion,
}));

import type { ManifiestoFlujoPrincipalE2e } from "./flujoPrincipalE2e";
import { limpiarRegistrosFlujoE2e } from "./limpiezaFlujoE2e";

const usuarioId = "10000000-0000-4000-8000-000000000001";
const idSiniestro = "20000000-0000-4000-8000-000000000002";
const idPresupuesto = "40000000-0000-4000-8000-000000000004";
const idDetalle = "50000000-0000-4000-8000-000000000005";
const idOrden = "60000000-0000-4000-8000-000000000006";
const idOrdenSector = "70000000-0000-4000-8000-000000000007";
const idIntento = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tiposDocumentos = [
  "DENUNCIA",
  "LATERAL_DERECHA",
  "LATERAL_IZQUIERDA",
  "FRONTAL",
  "TRASERA",
  "CERTIFICADO_COBERTURA",
] as const;

type OperacionTransaccion = (
  cliente: typeof dependencias.cliente,
) => Promise<unknown>;

function crearManifiesto(): ManifiestoFlujoPrincipalE2e {
  const hash = createHash("sha256").update(usuarioId).digest("hex");
  const sufijo = hash.slice(0, 12).toUpperCase();
  const tokenNumerico = (cantidad: number) =>
    (BigInt(`0x${hash}`) % 10n ** BigInt(cantidad))
      .toString()
      .padStart(cantidad, "0");
  const cuerpoCuit = tokenNumerico(9);
  const provinciaId = "01000000-0000-4000-8000-000000000001";
  const localidadId = "02000000-0000-4000-8000-000000000002";
  const marcaId = "03000000-0000-4000-8000-000000000003";
  const modeloId = "04000000-0000-4000-8000-000000000004";
  const tipoVehiculoId = "05000000-0000-4000-8000-000000000005";
  const sectorId = "06000000-0000-4000-8000-000000000006";

  return {
    ejecucionId: usuarioId,
    provincia: { id: provinciaId, nombre: `Provincia E2E ${sufijo}` },
    localidad: {
      id: localidadId,
      nombre: `Localidad E2E ${sufijo}`,
      provinciaId,
    },
    cliente: {
      id: "07000000-0000-4000-8000-000000000007",
      nombre: "Cliente",
      apellido: `E2E ${sufijo}`,
      dni: tokenNumerico(8),
      telefono: "0000000001",
      email: `cliente.${hash.slice(0, 16)}@luqgarage.invalid`,
      direccion: `Dirección sintética E2E ${sufijo}`,
      activo: true,
      localidadId,
    },
    marca: { id: marcaId, nombre: `Marca E2E ${sufijo}` },
    modelo: { id: modeloId, nombre: `Modelo E2E ${sufijo}`, marcaId },
    tipoVehiculo: {
      id: tipoVehiculoId,
      nombre: `Automóvil E2E ${sufijo}`,
    },
    vehiculo: {
      id: "08000000-0000-4000-8000-000000000008",
      patente: `E2E${hash.slice(0, 7).toUpperCase()}`,
      activo: true,
      modeloId,
      tipoVehiculoId,
    },
    aseguradora: {
      id: "09000000-0000-4000-8000-000000000009",
      nombre: `Aseguradora E2E ${sufijo}`,
      cuit: `30-${cuerpoCuit.slice(0, 8)}-${cuerpoCuit.slice(8)}`,
      telefono: "0000000002",
      email: `aseguradora.${hash.slice(0, 16)}@luqgarage.invalid`,
      direccion: `Dirección sintética aseguradora E2E ${sufijo}`,
      activo: true,
    },
    sector: { id: sectorId, nombre: "Reparación" },
    reparacion: {
      id: "11000000-0000-4000-8000-000000000011",
      nombre: `Reparación de chapa E2E ${sufijo}`,
      sectorId,
    },
    playwright: {
      numeroSiniestro: `SIN-E2E-${sufijo}`,
      numeroPoliza: `POL-E2E-${sufijo}`,
      numeroPresupuesto: `PRES-E2E-${sufijo}`,
    },
  };
}

const manifiesto = crearManifiesto();

function documentos() {
  return tiposDocumentos.map((tipo, indice) => ({
    id: `30000000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
    tipo,
    referenciaArchivo: `siniestros/${idIntento}/bbbbbbbb-bbbb-4bbb-8bbb-${String(
      indice + 1,
    ).padStart(12, "0")}`,
    siniestroId: idSiniestro,
  }));
}

function configurarEscenario({
  estadoPresupuesto,
  estadoOrden,
}: {
  estadoPresupuesto?: "BORRADOR" | "ENVIADO" | "APROBADO";
  estadoOrden?: "BORRADOR" | "FINALIZADA";
} = {}) {
  const tienePresupuesto = estadoPresupuesto !== undefined;
  const tieneOrden = estadoOrden !== undefined;
  const siniestro = {
    id: idSiniestro,
    numeroSiniestro: manifiesto.playwright.numeroSiniestro,
    fechaSiniestro: new Date("2026-01-10T12:00:00.000Z"),
    fechaRegistro: new Date("2026-01-11T12:00:00.000Z"),
    gradoDano: "LEVE",
    numeroPoliza: manifiesto.playwright.numeroPoliza,
    estado: tienePresupuesto ? "PRESUPUESTADO" : "REGISTRADO",
    clienteId: manifiesto.cliente.id,
    vehiculoId: manifiesto.vehiculo.id,
    aseguradoraId: manifiesto.aseguradora.id,
    documentos: documentos(),
    _count: {
      documentos: 6,
      presupuestos: tienePresupuesto ? 1 : 0,
      ordenesTrabajo: tieneOrden ? 1 : 0,
    },
  };
  const presupuesto = tienePresupuesto
    ? {
        id: idPresupuesto,
        numeroPresupuesto: manifiesto.playwright.numeroPresupuesto,
        estado: estadoPresupuesto,
        siniestroId: idSiniestro,
        ordenTrabajoId: tieneOrden ? idOrden : null,
        reparaciones: [
          {
            id: idDetalle,
            costo: "1000.00",
            presupuestoId: idPresupuesto,
            reparacionId: manifiesto.reparacion.id,
          },
        ],
        repuestos: [],
        _count: { reparaciones: 1, repuestos: 0 },
      }
    : undefined;
  const orden = tieneOrden
    ? {
        id: idOrden,
        estado: estadoOrden,
        siniestroId: idSiniestro,
        presupuestos: [{ id: idPresupuesto }],
        sectores: [
          {
            id: idOrdenSector,
            observacion: null,
            ordenTrabajoId: idOrden,
            sectorId: manifiesto.sector.id,
          },
        ],
        _count: { presupuestos: 1, sectores: 1 },
      }
    : undefined;

  dependencias.cliente.siniestro.findMany.mockResolvedValue([siniestro]);
  dependencias.cliente.presupuesto.findMany.mockResolvedValue(
    presupuesto ? [presupuesto] : [],
  );
  dependencias.cliente.ordenDeTrabajo.findMany.mockResolvedValue(
    orden ? [orden] : [],
  );

  return { orden, presupuesto, siniestro };
}

function esperarNingunaEliminacion() {
  for (const modelo of Object.values(dependencias.cliente)) {
    expect(modelo.deleteMany).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTENTICACION_E2E_USUARIO_ID", usuarioId);
  dependencias.validarEntorno.mockReturnValue(true);
  dependencias.ejecutarTransaccion.mockImplementation(
    async (operacion: OperacionTransaccion) => operacion(dependencias.cliente),
  );
  dependencias.cliente.siniestro.findMany.mockResolvedValue([]);
  dependencias.cliente.presupuesto.findMany.mockResolvedValue([]);
  dependencias.cliente.ordenDeTrabajo.findMany.mockResolvedValue([]);
  dependencias.cliente.cliente.findMany.mockResolvedValue([]);
  dependencias.cliente.vehiculo.findMany.mockResolvedValue([]);
  dependencias.cliente.aseguradora.findMany.mockResolvedValue([]);
  dependencias.cliente.sector.findMany.mockResolvedValue([]);
  dependencias.cliente.reparacion.findMany.mockResolvedValue([]);
  dependencias.cliente.cliente.findUnique.mockResolvedValue(manifiesto.cliente);
  dependencias.cliente.vehiculo.findUnique.mockResolvedValue(
    manifiesto.vehiculo,
  );
  dependencias.cliente.aseguradora.findUnique.mockResolvedValue(
    manifiesto.aseguradora,
  );
  dependencias.cliente.sector.findUnique.mockResolvedValue(manifiesto.sector);
  dependencias.cliente.reparacion.findUnique.mockResolvedValue(
    manifiesto.reparacion,
  );

  for (const modelo of Object.values(dependencias.cliente)) {
    modelo.deleteMany.mockResolvedValue({ count: 1 });
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("limpieza del recorrido principal E2E", () => {
  it("no elimina nada cuando el navegador todavia no creo el siniestro", async () => {
    await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
      eliminado: false,
    });

    esperarNingunaEliminacion();
  });

  it("elimina el siniestro registrado y sus seis documentos", async () => {
    configurarEscenario();

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
      eliminado: true,
    });

    expect(
      dependencias.cliente.documentoSiniestro.deleteMany,
    ).toHaveBeenCalledTimes(6);
    expect(dependencias.cliente.siniestro.deleteMany).toHaveBeenCalledOnce();
    expect(
      dependencias.cliente.documentoSiniestro.deleteMany.mock
        .invocationCallOrder[5],
    ).toBeLessThan(
      dependencias.cliente.siniestro.deleteMany.mock.invocationCallOrder[0]!,
    );
  });

  it.each(["BORRADOR", "ENVIADO", "APROBADO"] as const)(
    "elimina el presupuesto en estado %s",
    async (estadoPresupuesto) => {
      configurarEscenario({ estadoPresupuesto });

      await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
        eliminado: true,
      });

      expect(
        dependencias.cliente.detalleReparacion.deleteMany.mock
          .invocationCallOrder[0],
      ).toBeLessThan(
        dependencias.cliente.presupuesto.deleteMany.mock.invocationCallOrder[0]!,
      );
      expect(
        dependencias.cliente.presupuesto.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        dependencias.cliente.siniestro.deleteMany.mock.invocationCallOrder[0]!,
      );
    },
  );

  it.each(["BORRADOR", "FINALIZADA"] as const)(
    "elimina la orden de trabajo en estado %s",
    async (estadoOrden) => {
      configurarEscenario({ estadoPresupuesto: "APROBADO", estadoOrden });

      await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
        eliminado: true,
      });

      const ordenLlamadas = [
        dependencias.cliente.ordenTrabajoSector.deleteMany.mock
          .invocationCallOrder[0],
        dependencias.cliente.detalleReparacion.deleteMany.mock
          .invocationCallOrder[0],
        dependencias.cliente.presupuesto.deleteMany.mock.invocationCallOrder[0],
        dependencias.cliente.ordenDeTrabajo.deleteMany.mock
          .invocationCallOrder[0],
        dependencias.cliente.documentoSiniestro.deleteMany.mock
          .invocationCallOrder[0],
        dependencias.cliente.siniestro.deleteMany.mock.invocationCallOrder[0],
      ];
      expect(ordenLlamadas).toEqual([...ordenLlamadas].sort((a, b) => a! - b!));
    },
  );

  it("rechaza la limpieza si cambia la identidad del siniestro", async () => {
    const { siniestro } = configurarEscenario();
    siniestro.numeroPoliza = "POLIZA-AJENA";

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).rejects.toThrow(
      /identidad/,
    );
    esperarNingunaEliminacion();
  });

  it("rechaza la limpieza si cambia la identidad del fixture base", async () => {
    configurarEscenario();
    dependencias.cliente.vehiculo.findUnique.mockResolvedValue({
      ...manifiesto.vehiculo,
      patente: "PATENTE-AJENA",
    });

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).rejects.toThrow(
      /identidad/,
    );
    esperarNingunaEliminacion();
  });

  it("rechaza relaciones inesperadas", async () => {
    const { siniestro } = configurarEscenario({
      estadoPresupuesto: "BORRADOR",
    });
    siniestro._count.presupuestos = 2;

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).rejects.toThrow(
      /identidad/,
    );
    esperarNingunaEliminacion();
  });

  it("aborta la transaccion si falla una eliminacion", async () => {
    let rollbackSolicitado = false;
    configurarEscenario({
      estadoPresupuesto: "APROBADO",
      estadoOrden: "BORRADOR",
    });
    dependencias.cliente.detalleReparacion.deleteMany.mockRejectedValue(
      new Error("Fallo de persistencia simulado."),
    );
    dependencias.ejecutarTransaccion.mockImplementation(
      async (operacion: OperacionTransaccion) => {
        try {
          return await operacion(dependencias.cliente);
        } catch (error: unknown) {
          rollbackSolicitado = true;
          throw error;
        }
      },
    );

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).rejects.toThrow(
      /No se pudieron limpiar/,
    );

    expect(rollbackSolicitado).toBe(true);
    expect(dependencias.cliente.presupuesto.deleteMany).not.toHaveBeenCalled();
    expect(dependencias.cliente.siniestro.deleteMany).not.toHaveBeenCalled();
  });

  it("no ejecuta la transaccion fuera del entorno E2E autorizado", async () => {
    dependencias.validarEntorno.mockReturnValue(false);

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).rejects.toThrow(
      /no esta habilitada/,
    );

    expect(dependencias.ejecutarTransaccion).not.toHaveBeenCalled();
  });

  it("permite repetir la limpieza cuando el recorrido ya no existe", async () => {
    configurarEscenario();
    await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
      eliminado: true,
    });

    dependencias.cliente.siniestro.findMany.mockResolvedValue([]);
    dependencias.cliente.presupuesto.findMany.mockResolvedValue([]);
    dependencias.cliente.ordenDeTrabajo.findMany.mockResolvedValue([]);

    await expect(limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual({
      eliminado: false,
    });
  });
});
