import { createHash } from "node:crypto";

import type { TipoDocumentoSiniestro } from "@prisma/client";

import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";
import type { ManifiestoFlujoPrincipalE2e } from "./flujoPrincipalE2e";
import { ejecutarTransaccion } from "./transaccion";

const tiposDocumentosEsperados = [
  "DENUNCIA",
  "LATERAL_DERECHA",
  "LATERAL_IZQUIERDA",
  "FRONTAL",
  "TRASERA",
  "CERTIFICADO_COBERTURA",
] as const satisfies readonly TipoDocumentoSiniestro[];

const estadosPresupuestoEsperados = new Set([
  "BORRADOR",
  "ENVIADO",
  "APROBADO",
]);
const estadosOrdenEsperados = new Set(["BORRADOR", "FINALIZADA"]);
const patronReferenciaStorage =
  /^siniestros\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

class ErrorLimpiezaFlujoE2e extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorLimpiezaFlujoE2e";
  }
}

function validarEntornoE2e() {
  if (!validarEntornoAutenticacionE2e(process.env)) {
    throw new ErrorLimpiezaFlujoE2e(
      "La limpieza del recorrido E2E no esta habilitada.",
    );
  }
}

function tokenNumerico(hash: string, cantidad: number) {
  const modulo = 10n ** BigInt(cantidad);
  return (BigInt(`0x${hash}`) % modulo).toString().padStart(cantidad, "0");
}

function validarManifiesto(manifiesto: ManifiestoFlujoPrincipalE2e) {
  const ejecucionId = process.env.AUTENTICACION_E2E_USUARIO_ID;
  if (!ejecucionId || manifiesto.ejecucionId !== ejecucionId) {
    throw new ErrorLimpiezaFlujoE2e(
      "El manifiesto no pertenece a la ejecucion E2E actual.",
    );
  }

  const hash = createHash("sha256").update(ejecucionId).digest("hex");
  const sufijo = hash.slice(0, 12).toUpperCase();
  const cuerpoCuit = tokenNumerico(hash, 9);
  const relacionesInternasValidas =
    manifiesto.localidad.provinciaId === manifiesto.provincia.id &&
    manifiesto.cliente.localidadId === manifiesto.localidad.id &&
    manifiesto.modelo.marcaId === manifiesto.marca.id &&
    manifiesto.vehiculo.modeloId === manifiesto.modelo.id &&
    manifiesto.vehiculo.tipoVehiculoId === manifiesto.tipoVehiculo.id &&
    manifiesto.reparacion.sectorId === manifiesto.sector.id;
  const identidadRecorridoValida =
    manifiesto.provincia.nombre === `Provincia E2E ${sufijo}` &&
    manifiesto.localidad.nombre === `Localidad E2E ${sufijo}` &&
    manifiesto.cliente.nombre === "Cliente" &&
    manifiesto.cliente.apellido === `E2E ${sufijo}` &&
    manifiesto.cliente.dni === tokenNumerico(hash, 8) &&
    manifiesto.cliente.telefono === "0000000001" &&
    manifiesto.cliente.email ===
      `cliente.${hash.slice(0, 16)}@luqgarage.invalid` &&
    manifiesto.cliente.direccion === `Dirección sintética E2E ${sufijo}` &&
    manifiesto.cliente.activo === true &&
    manifiesto.marca.nombre === `Marca E2E ${sufijo}` &&
    manifiesto.modelo.nombre === `Modelo E2E ${sufijo}` &&
    manifiesto.tipoVehiculo.nombre === `Automóvil E2E ${sufijo}` &&
    manifiesto.vehiculo.patente ===
      `E2E${hash.slice(0, 7).toUpperCase()}` &&
    manifiesto.vehiculo.activo === true &&
    manifiesto.aseguradora.nombre === `Aseguradora E2E ${sufijo}` &&
    manifiesto.aseguradora.cuit ===
      `30-${cuerpoCuit.slice(0, 8)}-${cuerpoCuit.slice(8)}` &&
    manifiesto.aseguradora.telefono === "0000000002" &&
    manifiesto.aseguradora.email ===
      `aseguradora.${hash.slice(0, 16)}@luqgarage.invalid` &&
    manifiesto.aseguradora.direccion ===
      `Dirección sintética aseguradora E2E ${sufijo}` &&
    manifiesto.aseguradora.activo === true &&
    manifiesto.sector.nombre === "Reparación" &&
    manifiesto.reparacion.nombre === `Reparación de chapa E2E ${sufijo}` &&
    manifiesto.playwright.numeroSiniestro === `SIN-E2E-${sufijo}` &&
    manifiesto.playwright.numeroPoliza === `POL-E2E-${sufijo}` &&
    manifiesto.playwright.numeroPresupuesto === `PRES-E2E-${sufijo}`;

  if (!relacionesInternasValidas || !identidadRecorridoValida) {
    throw new ErrorLimpiezaFlujoE2e(
      "El manifiesto no conserva la identidad del recorrido E2E.",
    );
  }
}

function referenciasDocumentosValidas(
  documentos: ReadonlyArray<{ referenciaArchivo: string; tipo: TipoDocumentoSiniestro }>,
) {
  if (documentos.length !== tiposDocumentosEsperados.length) return false;

  const tipos = documentos.map(({ tipo }) => tipo);
  if (
    tiposDocumentosEsperados.some(
      (tipo) => tipos.filter((actual) => actual === tipo).length !== 1,
    )
  ) {
    return false;
  }

  const coincidencias = documentos.map(({ referenciaArchivo }) =>
    referenciaArchivo.match(patronReferenciaStorage),
  );
  if (coincidencias.some((coincidencia) => !coincidencia)) return false;

  const intentos = new Set(coincidencias.map((coincidencia) => coincidencia![1]));
  const referencias = new Set(
    documentos.map(({ referenciaArchivo }) => referenciaArchivo),
  );
  return intentos.size === 1 && referencias.size === documentos.length;
}

function errorIdentidad(): never {
  throw new ErrorLimpiezaFlujoE2e(
    "No se limpiaron registros porque la identidad del recorrido E2E cambio.",
  );
}

async function exigirEliminacionUnica(
  eliminacion: Promise<{ count: number }>,
) {
  const resultado = await eliminacion;
  if (resultado.count !== 1) {
    throw new ErrorLimpiezaFlujoE2e(
      "No se completo la limpieza porque un registro cambio durante la operacion.",
    );
  }
}

export async function limpiarRegistrosFlujoE2e(
  manifiesto: ManifiestoFlujoPrincipalE2e,
): Promise<{ eliminado: boolean }> {
  validarEntornoE2e();
  validarManifiesto(manifiesto);

  try {
    return await ejecutarTransaccion(async (cliente) => {
      const [
        clienteFixture,
        vehiculoFixture,
        aseguradoraFixture,
        sectorFixture,
        reparacionFixture,
        siniestros,
        presupuestos,
        ordenes,
      ] = await Promise.all([
        cliente.cliente.findUnique({
          where: { id: manifiesto.cliente.id },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            telefono: true,
            email: true,
            direccion: true,
            activo: true,
            localidadId: true,
          },
        }),
        cliente.vehiculo.findUnique({
          where: { id: manifiesto.vehiculo.id },
          select: {
            id: true,
            patente: true,
            activo: true,
            modeloId: true,
            tipoVehiculoId: true,
          },
        }),
        cliente.aseguradora.findUnique({
          where: { id: manifiesto.aseguradora.id },
          select: {
            id: true,
            nombre: true,
            cuit: true,
            telefono: true,
            email: true,
            direccion: true,
            activo: true,
          },
        }),
        cliente.sector.findUnique({
          where: { id: manifiesto.sector.id },
          select: { id: true, nombre: true },
        }),
        cliente.reparacion.findUnique({
          where: { id: manifiesto.reparacion.id },
          select: { id: true, nombre: true, sectorId: true },
        }),
        cliente.siniestro.findMany({
          where: {
            OR: [
              { numeroSiniestro: manifiesto.playwright.numeroSiniestro },
              { clienteId: manifiesto.cliente.id },
              { vehiculoId: manifiesto.vehiculo.id },
              { aseguradoraId: manifiesto.aseguradora.id },
            ],
          },
          take: 2,
          select: {
            id: true,
            numeroSiniestro: true,
            fechaSiniestro: true,
            fechaRegistro: true,
            gradoDano: true,
            numeroPoliza: true,
            estado: true,
            clienteId: true,
            vehiculoId: true,
            aseguradoraId: true,
            documentos: {
              take: 7,
              orderBy: { id: "asc" },
              select: {
                id: true,
                tipo: true,
                referenciaArchivo: true,
                siniestroId: true,
              },
            },
            _count: {
              select: {
                documentos: true,
                presupuestos: true,
                ordenesTrabajo: true,
              },
            },
          },
        }),
        cliente.presupuesto.findMany({
          where: {
            OR: [
              { numeroPresupuesto: manifiesto.playwright.numeroPresupuesto },
              {
                reparaciones: {
                  some: { reparacionId: manifiesto.reparacion.id },
                },
              },
            ],
          },
          take: 2,
          select: {
            id: true,
            numeroPresupuesto: true,
            estado: true,
            siniestroId: true,
            ordenTrabajoId: true,
            reparaciones: {
              take: 2,
              select: {
                id: true,
                costo: true,
                presupuestoId: true,
                reparacionId: true,
              },
            },
            repuestos: {
              take: 1,
              select: { id: true },
            },
            _count: { select: { reparaciones: true, repuestos: true } },
          },
        }),
        cliente.ordenDeTrabajo.findMany({
          where: {
            OR: [
              {
                sectores: {
                  some: { sectorId: manifiesto.sector.id },
                },
              },
              {
                presupuestos: {
                  some: {
                    numeroPresupuesto: manifiesto.playwright.numeroPresupuesto,
                  },
                },
              },
            ],
          },
          take: 2,
          select: {
            id: true,
            estado: true,
            siniestroId: true,
            presupuestos: {
              take: 2,
              select: { id: true },
            },
            sectores: {
              take: 2,
              select: {
                id: true,
                observacion: true,
                ordenTrabajoId: true,
                sectorId: true,
              },
            },
            _count: { select: { presupuestos: true, sectores: true } },
          },
        }),
      ]);

      const identidadFixtureValida =
        clienteFixture?.id === manifiesto.cliente.id &&
        clienteFixture.nombre === manifiesto.cliente.nombre &&
        clienteFixture.apellido === manifiesto.cliente.apellido &&
        clienteFixture.dni === manifiesto.cliente.dni &&
        clienteFixture.telefono === manifiesto.cliente.telefono &&
        clienteFixture.email === manifiesto.cliente.email &&
        clienteFixture.direccion === manifiesto.cliente.direccion &&
        clienteFixture.activo === manifiesto.cliente.activo &&
        clienteFixture.localidadId === manifiesto.cliente.localidadId &&
        vehiculoFixture?.id === manifiesto.vehiculo.id &&
        vehiculoFixture.patente === manifiesto.vehiculo.patente &&
        vehiculoFixture.activo === manifiesto.vehiculo.activo &&
        vehiculoFixture.modeloId === manifiesto.vehiculo.modeloId &&
        vehiculoFixture.tipoVehiculoId ===
          manifiesto.vehiculo.tipoVehiculoId &&
        aseguradoraFixture?.id === manifiesto.aseguradora.id &&
        aseguradoraFixture.nombre === manifiesto.aseguradora.nombre &&
        aseguradoraFixture.cuit === manifiesto.aseguradora.cuit &&
        aseguradoraFixture.telefono === manifiesto.aseguradora.telefono &&
        aseguradoraFixture.email === manifiesto.aseguradora.email &&
        aseguradoraFixture.direccion === manifiesto.aseguradora.direccion &&
        aseguradoraFixture.activo === manifiesto.aseguradora.activo &&
        sectorFixture?.id === manifiesto.sector.id &&
        sectorFixture.nombre === manifiesto.sector.nombre &&
        reparacionFixture?.id === manifiesto.reparacion.id &&
        reparacionFixture.nombre === manifiesto.reparacion.nombre &&
        reparacionFixture.sectorId === manifiesto.reparacion.sectorId;

      if (!identidadFixtureValida) errorIdentidad();

      if (
        siniestros.length === 0 &&
        presupuestos.length === 0 &&
        ordenes.length === 0
      ) {
        return { eliminado: false };
      }

      if (
        siniestros.length !== 1 ||
        presupuestos.length > 1 ||
        ordenes.length > 1
      ) {
        errorIdentidad();
      }

      const siniestro = siniestros[0]!;
      if (
        siniestro.numeroSiniestro !== manifiesto.playwright.numeroSiniestro ||
        siniestro.numeroPoliza !== manifiesto.playwright.numeroPoliza ||
        siniestro.clienteId !== manifiesto.cliente.id ||
        siniestro.vehiculoId !== manifiesto.vehiculo.id ||
        siniestro.aseguradoraId !== manifiesto.aseguradora.id ||
        siniestro._count.documentos !== tiposDocumentosEsperados.length ||
        !referenciasDocumentosValidas(siniestro.documentos)
      ) {
        errorIdentidad();
      }

      const presupuesto = presupuestos[0];
      const orden = ordenes[0];

      if (!presupuesto) {
        if (
          orden ||
          siniestro.estado !== "REGISTRADO" ||
          siniestro._count.presupuestos !== 0 ||
          siniestro._count.ordenesTrabajo !== 0
        ) {
          errorIdentidad();
        }
      } else {
        const reparacion = presupuesto.reparaciones[0];
        if (
          presupuesto.numeroPresupuesto !==
            manifiesto.playwright.numeroPresupuesto ||
          presupuesto.siniestroId !== siniestro.id ||
          !estadosPresupuestoEsperados.has(presupuesto.estado) ||
          siniestro.estado !== "PRESUPUESTADO" ||
          siniestro._count.presupuestos !== 1 ||
          presupuesto._count.reparaciones !== 1 ||
          presupuesto._count.repuestos !== 0 ||
          presupuesto.repuestos.length !== 0 ||
          !reparacion ||
          reparacion.presupuestoId !== presupuesto.id ||
          reparacion.reparacionId !== manifiesto.reparacion.id
        ) {
          errorIdentidad();
        }

        if (!orden) {
          if (
            presupuesto.ordenTrabajoId !== null ||
            siniestro._count.ordenesTrabajo !== 0
          ) {
            errorIdentidad();
          }
        } else {
          const sector = orden.sectores[0];
          if (
            presupuesto.estado !== "APROBADO" ||
            presupuesto.ordenTrabajoId !== orden.id ||
            orden.siniestroId !== siniestro.id ||
            !estadosOrdenEsperados.has(orden.estado) ||
            siniestro._count.ordenesTrabajo !== 1 ||
            orden._count.presupuestos !== 1 ||
            orden.presupuestos.length !== 1 ||
            orden.presupuestos[0]?.id !== presupuesto.id ||
            orden._count.sectores !== 1 ||
            orden.sectores.length !== 1 ||
            !sector ||
            sector.ordenTrabajoId !== orden.id ||
            sector.sectorId !== manifiesto.sector.id ||
            sector.observacion !== null
          ) {
            errorIdentidad();
          }
        }
      }

      if (orden) {
        const sector = orden.sectores[0]!;
        await exigirEliminacionUnica(
          cliente.ordenTrabajoSector.deleteMany({
            where: {
              id: sector.id,
              observacion: sector.observacion,
              ordenTrabajoId: orden.id,
              sectorId: manifiesto.sector.id,
            },
          }),
        );
      }

      if (presupuesto) {
        const reparacion = presupuesto.reparaciones[0]!;
        await exigirEliminacionUnica(
          cliente.detalleReparacion.deleteMany({
            where: {
              id: reparacion.id,
              costo: reparacion.costo,
              presupuestoId: presupuesto.id,
              reparacionId: manifiesto.reparacion.id,
            },
          }),
        );
        await exigirEliminacionUnica(
          cliente.presupuesto.deleteMany({
            where: {
              id: presupuesto.id,
              numeroPresupuesto: manifiesto.playwright.numeroPresupuesto,
              estado: presupuesto.estado,
              siniestroId: siniestro.id,
              ordenTrabajoId: presupuesto.ordenTrabajoId,
            },
          }),
        );
      }

      if (orden) {
        await exigirEliminacionUnica(
          cliente.ordenDeTrabajo.deleteMany({
            where: {
              id: orden.id,
              estado: orden.estado,
              siniestroId: siniestro.id,
            },
          }),
        );
      }

      for (const documento of siniestro.documentos) {
        await exigirEliminacionUnica(
          cliente.documentoSiniestro.deleteMany({
            where: {
              id: documento.id,
              tipo: documento.tipo,
              referenciaArchivo: documento.referenciaArchivo,
              siniestroId: siniestro.id,
            },
          }),
        );
      }

      await exigirEliminacionUnica(
        cliente.siniestro.deleteMany({
          where: {
            id: siniestro.id,
            numeroSiniestro: siniestro.numeroSiniestro,
            fechaSiniestro: siniestro.fechaSiniestro,
            fechaRegistro: siniestro.fechaRegistro,
            gradoDano: siniestro.gradoDano,
            numeroPoliza: siniestro.numeroPoliza,
            estado: siniestro.estado,
            clienteId: siniestro.clienteId,
            vehiculoId: siniestro.vehiculoId,
            aseguradoraId: siniestro.aseguradoraId,
          },
        }),
      );

      return { eliminado: true };
    });
  } catch (error: unknown) {
    if (error instanceof ErrorLimpiezaFlujoE2e) throw error;
    throw new ErrorLimpiezaFlujoE2e(
      "No se pudieron limpiar los registros del recorrido E2E.",
    );
  }
}
