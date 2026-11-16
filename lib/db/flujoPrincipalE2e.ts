import { createHash, randomUUID } from "node:crypto";

import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";
import { ejecutarTransaccion } from "./transaccion";

const AUTH_URL_E2E = "http://127.0.0.1:3000";

type RegistroConNombre = {
  id: string;
  nombre: string;
};

export type ManifiestoFlujoPrincipalE2e = {
  ejecucionId: string;
  provincia: RegistroConNombre;
  localidad: RegistroConNombre & { provinciaId: string };
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email: string;
    direccion: string;
    activo: true;
    localidadId: string;
  };
  marca: RegistroConNombre;
  modelo: RegistroConNombre & { marcaId: string };
  tipoVehiculo: RegistroConNombre;
  vehiculo: {
    id: string;
    patente: string;
    activo: true;
    modeloId: string;
    tipoVehiculoId: string;
  };
  aseguradora: {
    id: string;
    nombre: string;
    cuit: string;
    telefono: string;
    email: string;
    direccion: string;
    activo: true;
  };
  sector: RegistroConNombre;
  reparacion: RegistroConNombre & { sectorId: string };
  playwright: {
    numeroSiniestro: string;
    numeroPoliza: string;
    numeroPresupuesto: string;
  };
};

class ErrorFixtureFlujoPrincipalE2e extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorFixtureFlujoPrincipalE2e";
  }
}

function validarEntornoE2e() {
  if (
    !validarEntornoAutenticacionE2e({
      ...process.env,
      AUTH_URL: AUTH_URL_E2E,
      NODE_ENV: "production",
    })
  ) {
    throw new ErrorFixtureFlujoPrincipalE2e(
      "El fixture del flujo principal E2E no esta habilitado.",
    );
  }
}

function tokenNumerico(hash: string, cantidad: number) {
  const modulo = 10n ** BigInt(cantidad);
  return (BigInt(`0x${hash}`) % modulo).toString().padStart(cantidad, "0");
}

function construirManifiesto(
  ejecucionId: string,
): ManifiestoFlujoPrincipalE2e {
  const hash = createHash("sha256").update(ejecucionId).digest("hex");
  const sufijo = hash.slice(0, 12).toUpperCase();
  const dni = tokenNumerico(hash, 8);
  const cuerpoCuit = tokenNumerico(hash, 9);

  const provincia = {
    id: randomUUID(),
    nombre: `Provincia E2E ${sufijo}`,
  };
  const localidad = {
    id: randomUUID(),
    nombre: `Localidad E2E ${sufijo}`,
    provinciaId: provincia.id,
  };
  const marca = { id: randomUUID(), nombre: `Marca E2E ${sufijo}` };
  const modelo = {
    id: randomUUID(),
    nombre: `Modelo E2E ${sufijo}`,
    marcaId: marca.id,
  };
  const tipoVehiculo = {
    id: randomUUID(),
    nombre: `Automóvil E2E ${sufijo}`,
  };
  const sector = { id: randomUUID(), nombre: "Reparación" };

  return {
    ejecucionId,
    provincia,
    localidad,
    cliente: {
      id: randomUUID(),
      nombre: "Cliente",
      apellido: `E2E ${sufijo}`,
      dni,
      telefono: "0000000001",
      email: `cliente.${hash.slice(0, 16)}@luqgarage.invalid`,
      direccion: `Dirección sintética E2E ${sufijo}`,
      activo: true,
      localidadId: localidad.id,
    },
    marca,
    modelo,
    tipoVehiculo,
    vehiculo: {
      id: randomUUID(),
      patente: `E2E${hash.slice(0, 7).toUpperCase()}`,
      activo: true,
      modeloId: modelo.id,
      tipoVehiculoId: tipoVehiculo.id,
    },
    aseguradora: {
      id: randomUUID(),
      nombre: `Aseguradora E2E ${sufijo}`,
      cuit: `30-${cuerpoCuit.slice(0, 8)}-${cuerpoCuit.slice(8)}`,
      telefono: "0000000002",
      email: `aseguradora.${hash.slice(0, 16)}@luqgarage.invalid`,
      direccion: `Dirección sintética aseguradora E2E ${sufijo}`,
      activo: true,
    },
    sector,
    reparacion: {
      id: randomUUID(),
      nombre: `Reparación de chapa E2E ${sufijo}`,
      sectorId: sector.id,
    },
    playwright: {
      numeroSiniestro: `SIN-E2E-${sufijo}`,
      numeroPoliza: `POL-E2E-${sufijo}`,
      numeroPresupuesto: `PRES-E2E-${sufijo}`,
    },
  };
}

function manifiestoEsperadoParaEjecucion(ejecucionId: string) {
  const hash = createHash("sha256").update(ejecucionId).digest("hex");
  const sufijo = hash.slice(0, 12).toUpperCase();

  return {
    provincia: `Provincia E2E ${sufijo}`,
    localidad: `Localidad E2E ${sufijo}`,
    clienteDni: tokenNumerico(hash, 8),
    marca: `Marca E2E ${sufijo}`,
    modelo: `Modelo E2E ${sufijo}`,
    tipoVehiculo: `Automóvil E2E ${sufijo}`,
    vehiculoPatente: `E2E${hash.slice(0, 7).toUpperCase()}`,
    aseguradoraCuit: `30-${tokenNumerico(hash, 9).slice(0, 8)}-${tokenNumerico(hash, 9).slice(8)}`,
    sector: "Reparación",
    reparacion: `Reparación de chapa E2E ${sufijo}`,
    numeroSiniestro: `SIN-E2E-${sufijo}`,
    numeroPoliza: `POL-E2E-${sufijo}`,
    numeroPresupuesto: `PRES-E2E-${sufijo}`,
  };
}

function validarPropiedadManifiesto(manifiesto: ManifiestoFlujoPrincipalE2e) {
  const ejecucionId = process.env.AUTENTICACION_E2E_USUARIO_ID;

  if (!ejecucionId || manifiesto.ejecucionId !== ejecucionId) {
    throw new ErrorFixtureFlujoPrincipalE2e(
      "El manifiesto no pertenece a la ejecucion E2E actual.",
    );
  }

  const esperado = manifiestoEsperadoParaEjecucion(ejecucionId);
  if (
    manifiesto.provincia.nombre !== esperado.provincia ||
    manifiesto.localidad.nombre !== esperado.localidad ||
    manifiesto.cliente.dni !== esperado.clienteDni ||
    manifiesto.marca.nombre !== esperado.marca ||
    manifiesto.modelo.nombre !== esperado.modelo ||
    manifiesto.tipoVehiculo.nombre !== esperado.tipoVehiculo ||
    manifiesto.vehiculo.patente !== esperado.vehiculoPatente ||
    manifiesto.aseguradora.cuit !== esperado.aseguradoraCuit ||
    manifiesto.sector.nombre !== esperado.sector ||
    manifiesto.reparacion.nombre !== esperado.reparacion ||
    manifiesto.playwright.numeroSiniestro !== esperado.numeroSiniestro ||
    manifiesto.playwright.numeroPoliza !== esperado.numeroPoliza ||
    manifiesto.playwright.numeroPresupuesto !== esperado.numeroPresupuesto
  ) {
    throw new ErrorFixtureFlujoPrincipalE2e(
      "El manifiesto no conserva la identidad de la ejecucion E2E.",
    );
  }
}

function errorPreparacion(error: unknown): never {
  if (error instanceof ErrorFixtureFlujoPrincipalE2e) throw error;
  throw new ErrorFixtureFlujoPrincipalE2e(
    "No se pudieron preparar los datos del flujo principal E2E.",
  );
}

function errorLimpieza(error: unknown): never {
  if (error instanceof ErrorFixtureFlujoPrincipalE2e) throw error;
  throw new ErrorFixtureFlujoPrincipalE2e(
    "No se pudieron limpiar los datos del flujo principal E2E.",
  );
}

export async function prepararFlujoPrincipalE2e(): Promise<ManifiestoFlujoPrincipalE2e> {
  validarEntornoE2e();
  const ejecucionId = process.env.AUTENTICACION_E2E_USUARIO_ID!;
  const manifiesto = construirManifiesto(ejecucionId);

  try {
    await ejecutarTransaccion(async (cliente) => {
      const conflictos = await Promise.all([
        cliente.provincia.findFirst({
          where: { OR: [{ id: manifiesto.provincia.id }, { nombre: manifiesto.provincia.nombre }] },
          select: { id: true },
        }),
        cliente.localidad.findFirst({
          where: {
            OR: [
              { id: manifiesto.localidad.id },
              {
                provinciaId: manifiesto.localidad.provinciaId,
                nombre: manifiesto.localidad.nombre,
              },
            ],
          },
          select: { id: true },
        }),
        cliente.cliente.findFirst({
          where: { OR: [{ id: manifiesto.cliente.id }, { dni: manifiesto.cliente.dni }] },
          select: { id: true },
        }),
        cliente.marca.findFirst({
          where: { OR: [{ id: manifiesto.marca.id }, { nombre: manifiesto.marca.nombre }] },
          select: { id: true },
        }),
        cliente.modelo.findFirst({
          where: {
            OR: [
              { id: manifiesto.modelo.id },
              {
                marcaId: manifiesto.modelo.marcaId,
                nombre: manifiesto.modelo.nombre,
              },
            ],
          },
          select: { id: true },
        }),
        cliente.tipoVehiculo.findFirst({
          where: { OR: [{ id: manifiesto.tipoVehiculo.id }, { nombre: manifiesto.tipoVehiculo.nombre }] },
          select: { id: true },
        }),
        cliente.vehiculo.findFirst({
          where: { OR: [{ id: manifiesto.vehiculo.id }, { patente: manifiesto.vehiculo.patente }] },
          select: { id: true },
        }),
        cliente.aseguradora.findFirst({
          where: { OR: [{ id: manifiesto.aseguradora.id }, { cuit: manifiesto.aseguradora.cuit }] },
          select: { id: true },
        }),
        cliente.sector.findFirst({
          where: { OR: [{ id: manifiesto.sector.id }, { nombre: manifiesto.sector.nombre }] },
          select: { id: true },
        }),
        cliente.reparacion.findFirst({
          where: { OR: [{ id: manifiesto.reparacion.id }, { nombre: manifiesto.reparacion.nombre }] },
          select: { id: true },
        }),
      ]);

      if (conflictos.some((conflicto) => conflicto !== null)) {
        throw new ErrorFixtureFlujoPrincipalE2e(
          "Existen registros que entran en conflicto con el fixture del flujo principal E2E.",
        );
      }

      await cliente.provincia.create({ data: manifiesto.provincia });
      await cliente.localidad.create({ data: manifiesto.localidad });
      await cliente.cliente.create({ data: manifiesto.cliente });
      await cliente.marca.create({ data: manifiesto.marca });
      await cliente.modelo.create({ data: manifiesto.modelo });
      await cliente.tipoVehiculo.create({ data: manifiesto.tipoVehiculo });
      await cliente.vehiculo.create({ data: manifiesto.vehiculo });
      await cliente.aseguradora.create({ data: manifiesto.aseguradora });
      await cliente.sector.create({ data: manifiesto.sector });
      await cliente.reparacion.create({ data: manifiesto.reparacion });
    });
  } catch (error: unknown) {
    errorPreparacion(error);
  }

  return manifiesto;
}

export async function eliminarFlujoPrincipalE2e(
  manifiesto: ManifiestoFlujoPrincipalE2e,
): Promise<void> {
  validarEntornoE2e();
  validarPropiedadManifiesto(manifiesto);

  try {
    await ejecutarTransaccion(async (cliente) => {
      const [
        provincia,
        localidad,
        clienteCreado,
        marca,
        modelo,
        tipoVehiculo,
        vehiculo,
        aseguradora,
        sector,
        reparacion,
      ] = await Promise.all([
        cliente.provincia.findUnique({
          where: { id: manifiesto.provincia.id },
          select: { id: true, nombre: true, _count: { select: { localidades: true } } },
        }),
        cliente.localidad.findUnique({
          where: { id: manifiesto.localidad.id },
          select: { id: true, nombre: true, provinciaId: true, _count: { select: { clientes: true } } },
        }),
        cliente.cliente.findUnique({
          where: { id: manifiesto.cliente.id },
          select: {
            id: true, nombre: true, apellido: true, dni: true, telefono: true,
            email: true, direccion: true, activo: true, localidadId: true,
            _count: { select: { siniestros: true } },
          },
        }),
        cliente.marca.findUnique({
          where: { id: manifiesto.marca.id },
          select: { id: true, nombre: true, _count: { select: { modelos: true } } },
        }),
        cliente.modelo.findUnique({
          where: { id: manifiesto.modelo.id },
          select: { id: true, nombre: true, marcaId: true, _count: { select: { vehiculos: true } } },
        }),
        cliente.tipoVehiculo.findUnique({
          where: { id: manifiesto.tipoVehiculo.id },
          select: { id: true, nombre: true, _count: { select: { vehiculos: true } } },
        }),
        cliente.vehiculo.findUnique({
          where: { id: manifiesto.vehiculo.id },
          select: {
            id: true, patente: true, activo: true, modeloId: true, tipoVehiculoId: true,
            _count: { select: { siniestros: true } },
          },
        }),
        cliente.aseguradora.findUnique({
          where: { id: manifiesto.aseguradora.id },
          select: {
            id: true, nombre: true, cuit: true, telefono: true, email: true,
            direccion: true, activo: true, _count: { select: { siniestros: true } },
          },
        }),
        cliente.sector.findUnique({
          where: { id: manifiesto.sector.id },
          select: {
            id: true, nombre: true,
            _count: { select: { reparaciones: true, ordenesTrabajoSectores: true } },
          },
        }),
        cliente.reparacion.findUnique({
          where: { id: manifiesto.reparacion.id },
          select: {
            id: true, nombre: true, sectorId: true,
            _count: { select: { detallesPresupuesto: true } },
          },
        }),
      ]);

      const identidadValida =
        provincia?.nombre === manifiesto.provincia.nombre &&
        localidad?.nombre === manifiesto.localidad.nombre &&
        localidad.provinciaId === manifiesto.localidad.provinciaId &&
        clienteCreado?.nombre === manifiesto.cliente.nombre &&
        clienteCreado.apellido === manifiesto.cliente.apellido &&
        clienteCreado.dni === manifiesto.cliente.dni &&
        clienteCreado.telefono === manifiesto.cliente.telefono &&
        clienteCreado.email === manifiesto.cliente.email &&
        clienteCreado.direccion === manifiesto.cliente.direccion &&
        clienteCreado.activo === manifiesto.cliente.activo &&
        clienteCreado.localidadId === manifiesto.cliente.localidadId &&
        marca?.nombre === manifiesto.marca.nombre &&
        modelo?.nombre === manifiesto.modelo.nombre &&
        modelo.marcaId === manifiesto.modelo.marcaId &&
        tipoVehiculo?.nombre === manifiesto.tipoVehiculo.nombre &&
        vehiculo?.patente === manifiesto.vehiculo.patente &&
        vehiculo.activo === manifiesto.vehiculo.activo &&
        vehiculo.modeloId === manifiesto.vehiculo.modeloId &&
        vehiculo.tipoVehiculoId === manifiesto.vehiculo.tipoVehiculoId &&
        aseguradora?.nombre === manifiesto.aseguradora.nombre &&
        aseguradora.cuit === manifiesto.aseguradora.cuit &&
        aseguradora.telefono === manifiesto.aseguradora.telefono &&
        aseguradora.email === manifiesto.aseguradora.email &&
        aseguradora.direccion === manifiesto.aseguradora.direccion &&
        aseguradora.activo === manifiesto.aseguradora.activo &&
        sector?.nombre === manifiesto.sector.nombre &&
        reparacion?.nombre === manifiesto.reparacion.nombre &&
        reparacion.sectorId === manifiesto.reparacion.sectorId;

      if (!identidadValida) {
        throw new ErrorFixtureFlujoPrincipalE2e(
          "No se limpiaron los datos E2E porque su identidad cambio.",
        );
      }

      const dependenciasValidas =
        provincia._count.localidades === 1 &&
        localidad._count.clientes === 1 &&
        clienteCreado._count.siniestros === 0 &&
        marca._count.modelos === 1 &&
        modelo._count.vehiculos === 1 &&
        tipoVehiculo._count.vehiculos === 1 &&
        vehiculo._count.siniestros === 0 &&
        aseguradora._count.siniestros === 0 &&
        sector._count.reparaciones === 1 &&
        sector._count.ordenesTrabajoSectores === 0 &&
        reparacion._count.detallesPresupuesto === 0;

      if (!dependenciasValidas) {
        throw new ErrorFixtureFlujoPrincipalE2e(
          "No se limpiaron los datos E2E porque tienen relaciones inesperadas.",
        );
      }

      const eliminaciones = [
        await cliente.reparacion.deleteMany({ where: manifiesto.reparacion }),
        await cliente.sector.deleteMany({ where: manifiesto.sector }),
        await cliente.aseguradora.deleteMany({ where: manifiesto.aseguradora }),
        await cliente.vehiculo.deleteMany({ where: manifiesto.vehiculo }),
        await cliente.tipoVehiculo.deleteMany({ where: manifiesto.tipoVehiculo }),
        await cliente.modelo.deleteMany({ where: manifiesto.modelo }),
        await cliente.marca.deleteMany({ where: manifiesto.marca }),
        await cliente.cliente.deleteMany({ where: manifiesto.cliente }),
        await cliente.localidad.deleteMany({ where: manifiesto.localidad }),
        await cliente.provincia.deleteMany({ where: manifiesto.provincia }),
      ];

      if (eliminaciones.some(({ count }) => count !== 1)) {
        throw new ErrorFixtureFlujoPrincipalE2e(
          "No se limpiaron los datos E2E porque su identidad cambio durante la operacion.",
        );
      }
    });
  } catch (error: unknown) {
    errorLimpieza(error);
  }
}
