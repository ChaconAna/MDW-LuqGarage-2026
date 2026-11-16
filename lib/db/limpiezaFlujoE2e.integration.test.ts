import { randomBytes, randomUUID } from "node:crypto";

import type { PrismaClient, TipoDocumentoSiniestro } from "@prisma/client";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";

import type { ManifiestoFlujoPrincipalE2e } from "./flujoPrincipalE2e";
import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";
import { validarEntornoPruebas } from "../schemas/entornoPruebas";

const AUTH_URL_E2E = "http://127.0.0.1:3000";
const tiposDocumentos: readonly TipoDocumentoSiniestro[] = [
  "DENUNCIA",
  "LATERAL_DERECHA",
  "LATERAL_IZQUIERDA",
  "FRONTAL",
  "TRASERA",
  "CERTIFICADO_COBERTURA",
];

type GrafoCreado = {
  siniestroId: string;
  documentosIds: string[];
  presupuestoId: string;
  detalleId: string;
  ordenId: string;
  ordenSectorId: string;
  adicionalId?: string;
};

let prisma: PrismaClient | undefined;

function exigirEntornoSeguro() {
  if (process.env.PRUEBAS_PERSISTENCIA !== "1") {
    throw new Error(
      "La integracion requiere PRUEBAS_PERSISTENCIA=1 y PostgreSQL temporal autorizado en GitHub Actions.",
    );
  }
  validarEntornoPruebas(process.env);

  vi.stubEnv("AUTENTICACION_E2E", "1");
  vi.stubEnv(
    "AUTENTICACION_E2E_CREDENCIAL",
    randomBytes(32).toString("hex"),
  );
  vi.stubEnv("AUTENTICACION_E2E_USUARIO_ID", randomUUID());
  vi.stubEnv("AUTH_URL", AUTH_URL_E2E);
  vi.stubEnv("NODE_ENV", "production");

  if (!validarEntornoAutenticacionE2e(process.env)) {
    throw new Error("La autenticacion E2E no esta habilitada.");
  }
}

async function obtenerPrisma() {
  if (!prisma) prisma = (await import("./client")).prisma;
  return prisma;
}

async function crearGrafoCompleto(
  cliente: PrismaClient,
  manifiesto: ManifiestoFlujoPrincipalE2e,
): Promise<GrafoCreado> {
  const siniestroId = randomUUID();
  const presupuestoId = randomUUID();
  const detalleId = randomUUID();
  const ordenId = randomUUID();
  const ordenSectorId = randomUUID();
  const intentoStorageId = randomUUID();
  const documentosIds = tiposDocumentos.map(() => randomUUID());

  await cliente.$transaction(async (transaccion) => {
    await transaccion.siniestro.create({
      data: {
        id: siniestroId,
        numeroSiniestro: manifiesto.playwright.numeroSiniestro,
        fechaSiniestro: new Date("2026-01-10T12:00:00.000Z"),
        gradoDano: "LEVE",
        numeroPoliza: manifiesto.playwright.numeroPoliza,
        estado: "PRESUPUESTADO",
        clienteId: manifiesto.cliente.id,
        vehiculoId: manifiesto.vehiculo.id,
        aseguradoraId: manifiesto.aseguradora.id,
      },
    });
    await transaccion.documentoSiniestro.createMany({
      data: tiposDocumentos.map((tipo, indice) => ({
        id: documentosIds[indice]!,
        tipo,
        referenciaArchivo: `siniestros/${intentoStorageId}/${randomUUID()}`,
        siniestroId,
      })),
    });
    await transaccion.presupuesto.create({
      data: {
        id: presupuestoId,
        numeroPresupuesto: manifiesto.playwright.numeroPresupuesto,
        estado: "APROBADO",
        siniestroId,
      },
    });
    await transaccion.detalleReparacion.create({
      data: {
        id: detalleId,
        costo: "1000.00",
        presupuestoId,
        reparacionId: manifiesto.reparacion.id,
      },
    });
    await transaccion.ordenDeTrabajo.create({
      data: {
        id: ordenId,
        estado: "FINALIZADA",
        siniestroId,
      },
    });
    await transaccion.presupuesto.update({
      where: { id: presupuestoId },
      data: { ordenTrabajoId: ordenId },
    });
    await transaccion.ordenTrabajoSector.create({
      data: {
        id: ordenSectorId,
        ordenTrabajoId: ordenId,
        sectorId: manifiesto.sector.id,
      },
    });
  });

  return {
    siniestroId,
    documentosIds,
    presupuestoId,
    detalleId,
    ordenId,
    ordenSectorId,
  };
}

async function contarGrafo(cliente: PrismaClient, grafo: GrafoCreado) {
  return Promise.all([
    cliente.siniestro.count({ where: { id: grafo.siniestroId } }),
    cliente.documentoSiniestro.count({
      where: { id: { in: grafo.documentosIds } },
    }),
    cliente.presupuesto.count({ where: { id: grafo.presupuestoId } }),
    cliente.detalleReparacion.count({ where: { id: grafo.detalleId } }),
    cliente.ordenDeTrabajo.count({ where: { id: grafo.ordenId } }),
    cliente.ordenTrabajoSector.count({ where: { id: grafo.ordenSectorId } }),
  ]);
}

async function limpiarGrafoResidual(
  cliente: PrismaClient,
  grafo: GrafoCreado | undefined,
) {
  if (!grafo) return;
  await cliente.$transaction([
    cliente.ordenTrabajoSector.deleteMany({
      where: { id: grafo.ordenSectorId },
    }),
    cliente.detalleReparacion.deleteMany({ where: { id: grafo.detalleId } }),
    cliente.presupuesto.deleteMany({ where: { id: grafo.presupuestoId } }),
    cliente.ordenDeTrabajo.deleteMany({ where: { id: grafo.ordenId } }),
    cliente.documentoSiniestro.deleteMany({
      where: {
        id: { in: [...grafo.documentosIds, ...(grafo.adicionalId ? [grafo.adicionalId] : [])] },
      },
    }),
    cliente.siniestro.deleteMany({ where: { id: grafo.siniestroId } }),
  ]);
}

async function ejecutarConFixture(
  prueba: (
    cliente: PrismaClient,
    manifiesto: ManifiestoFlujoPrincipalE2e,
    registrarGrafo: (grafo: GrafoCreado) => void,
  ) => Promise<void>,
) {
  const cliente = await obtenerPrisma();
  const fixture = await import("./flujoPrincipalE2e");
  let manifiesto: ManifiestoFlujoPrincipalE2e | undefined;
  let grafo: GrafoCreado | undefined;
  let falloPrueba = false;
  let errorPrueba: unknown;

  try {
    manifiesto = await fixture.prepararFlujoPrincipalE2e();
    await prueba(cliente, manifiesto, (creado) => {
      grafo = creado;
    });
  } catch (error: unknown) {
    falloPrueba = true;
    errorPrueba = error;
  }

  const erroresLimpieza: unknown[] = [];
  try {
    await limpiarGrafoResidual(cliente, grafo);
  } catch (error: unknown) {
    erroresLimpieza.push(error);
  }
  if (manifiesto) {
    try {
      await fixture.eliminarFlujoPrincipalE2e(manifiesto);
    } catch (error: unknown) {
      erroresLimpieza.push(error);
    }
  }

  if (falloPrueba) {
    if (erroresLimpieza.length > 0) {
      throw new AggregateError(
        [errorPrueba, ...erroresLimpieza],
        "Fallo la prueba de limpieza E2E y tambien su limpieza final.",
      );
    }
    throw errorPrueba;
  }
  if (erroresLimpieza.length > 0) {
    throw new AggregateError(
      erroresLimpieza,
      "Fallo la limpieza final de la prueba del recorrido E2E.",
    );
  }
}

async function esperarBloqueoDePresupuesto(
  cliente: PrismaClient,
  pidBloqueante: number,
) {
  const limite = Date.now() + 5_000;
  while (Date.now() < limite) {
    const sesiones = await cliente.$queryRaw<Array<{ cantidad: bigint }>>`
      SELECT COUNT(*)::bigint AS cantidad
      FROM pg_stat_activity AS sesion_bloqueada
      WHERE sesion_bloqueada.datname = current_database()
        AND sesion_bloqueada.pid <> pg_backend_pid()
        AND sesion_bloqueada.state = 'active'
        AND sesion_bloqueada.wait_event_type = 'Lock'
        AND ${pidBloqueante} = ANY(pg_blocking_pids(sesion_bloqueada.pid))
    `;
    if ((sesiones[0]?.cantidad ?? 0n) > 0n) return;
    await new Promise((resolver) => setTimeout(resolver, 25));
  }
  throw new Error("La limpieza no alcanzo el bloqueo esperado en PostgreSQL.");
}

function crearPromesaControlada<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (razon?: unknown) => void;
  const promesa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });
  return { promesa, rechazar, resolver };
}

beforeEach(() => {
  exigirEntornoSeguro();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

it("elimina el grafo completo y no deja registros residuales", async () => {
  await ejecutarConFixture(async (cliente, manifiesto, registrarGrafo) => {
    const grafo = await crearGrafoCompleto(cliente, manifiesto);
    registrarGrafo(grafo);

    const limpieza = await import("./limpiezaFlujoE2e");
    await expect(limpieza.limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual(
      { eliminado: true },
    );
    expect(await contarGrafo(cliente, grafo)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

it("rechaza una relacion documental inesperada sin eliminar el grafo", async () => {
  await ejecutarConFixture(async (cliente, manifiesto, registrarGrafo) => {
    const grafo = await crearGrafoCompleto(cliente, manifiesto);
    grafo.adicionalId = randomUUID();
    registrarGrafo(grafo);
    await cliente.documentoSiniestro.create({
      data: {
        id: grafo.adicionalId,
        tipo: "ADICIONAL",
        referenciaArchivo: `siniestros/${randomUUID()}/${randomUUID()}`,
        siniestroId: grafo.siniestroId,
      },
    });

    const limpieza = await import("./limpiezaFlujoE2e");
    await expect(
      limpieza.limpiarRegistrosFlujoE2e(manifiesto),
    ).rejects.toThrow(/identidad/);
    expect(await contarGrafo(cliente, grafo)).toEqual([1, 6, 1, 1, 1, 1]);
    expect(
      await cliente.documentoSiniestro.count({
        where: { id: grafo.adicionalId },
      }),
    ).toBe(1);
  });
});

it("revierte eliminaciones previas si el presupuesto cambia durante la transaccion", async () => {
  await ejecutarConFixture(async (cliente, manifiesto, registrarGrafo) => {
    const grafo = await crearGrafoCompleto(cliente, manifiesto);
    registrarGrafo(grafo);

    const liberacion = crearPromesaControlada<void>();
    const confirmacion = crearPromesaControlada<number>();
    const limpieza = await import("./limpiezaFlujoE2e");
    const transaccionBloqueante = cliente.$transaction(
      async (transaccion) => {
        try {
          const sesiones = await transaccion.$queryRaw<Array<{ pid: number }>>`
            SELECT pg_backend_pid() AS pid
          `;
          const pid = sesiones[0]?.pid;
          if (!pid) throw new Error("PostgreSQL no informo el PID esperado.");

          await transaccion.$queryRaw`
            SELECT id
            FROM "Presupuesto"
            WHERE id = ${grafo.presupuestoId}::uuid
            FOR UPDATE
          `;
          confirmacion.resolver(pid);
          await liberacion.promesa;
          await transaccion.presupuesto.update({
            where: { id: grafo.presupuestoId },
            data: { estado: "ENVIADO" },
          });
        } catch (error: unknown) {
          confirmacion.rechazar(error);
          throw error;
        }
      },
      { timeout: 15_000 },
    );

    let errorOrquestacion: unknown;
    let promesaLimpieza: ReturnType<
      typeof import("./limpiezaFlujoE2e")["limpiarRegistrosFlujoE2e"]
    > | undefined;
    try {
      const pidBloqueante = await confirmacion.promesa;
      promesaLimpieza = limpieza.limpiarRegistrosFlujoE2e(manifiesto);
      await esperarBloqueoDePresupuesto(cliente, pidBloqueante);
    } catch (error: unknown) {
      errorOrquestacion = error;
    } finally {
      liberacion.resolver();
    }

    const resultados = await Promise.allSettled([
      transaccionBloqueante,
      ...(promesaLimpieza ? [promesaLimpieza] : []),
    ]);
    const resultadoBloqueante = resultados[0]!;
    const resultadoLimpieza = resultados[1];

    const erroresOrquestacion = [
      errorOrquestacion,
      resultadoBloqueante.status === "rejected"
        ? resultadoBloqueante.reason
        : undefined,
    ].filter((error) => error !== undefined);
    if (erroresOrquestacion.length > 0) {
      throw new AggregateError(
        erroresOrquestacion,
        "Fallo la coordinacion del escenario de rollback.",
      );
    }
    if (!resultadoLimpieza) {
      throw new Error("La limpieza de rollback no llego a iniciarse.");
    }

    expect(resultadoLimpieza.status).toBe("rejected");
    if (resultadoLimpieza.status === "rejected") {
      expect(resultadoLimpieza.reason).toBeInstanceOf(Error);
      expect((resultadoLimpieza.reason as Error).message).toMatch(
        /cambio durante/,
      );
    }
    expect(await contarGrafo(cliente, grafo)).toEqual([1, 6, 1, 1, 1, 1]);

    await cliente.presupuesto.update({
      where: { id: grafo.presupuestoId },
      data: { estado: "APROBADO" },
    });
    await expect(limpieza.limpiarRegistrosFlujoE2e(manifiesto)).resolves.toEqual(
      { eliminado: true },
    );
  });
}, 45_000);
