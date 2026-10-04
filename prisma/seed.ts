/**
 * Punto de entrada del seed de desarrollo.
 *
 * Correr con: npm run db:seed
 */
import { prisma } from "../lib/db/client";
import { asegurarAseguradoraPorCuit } from "../lib/db/aseguradora";
import { asegurarClientePorDni } from "../lib/db/cliente";
import { asegurarDetalleReparacion } from "../lib/db/detalleReparacion";
import { asegurarDetalleRepuesto } from "../lib/db/detalleRepuesto";
import { asegurarDocumentoSiniestroPorId } from "../lib/db/documentoSiniestro";
import { asegurarLocalidadPorProvinciaYNombre } from "../lib/db/localidad";
import { asegurarMarcaPorNombre } from "../lib/db/marca";
import { asegurarModeloPorMarcaYNombre } from "../lib/db/modelo";
import { asegurarOrdenTrabajoPorId } from "../lib/db/ordenTrabajo";
import { asegurarOrdenTrabajoSector } from "../lib/db/ordenTrabajoSector";
import { asegurarPresupuestoPorNumero } from "../lib/db/presupuesto";
import { asegurarProvinciaPorNombre } from "../lib/db/provincia";
import { asegurarReparacionPorNombre } from "../lib/db/reparacion";
import { asegurarRepuestoPorNombre } from "../lib/db/repuesto";
import { asegurarSectorPorNombre } from "../lib/db/sector";
import { asegurarSiniestroPorNumero } from "../lib/db/siniestro";
import { asegurarTipoVehiculoPorNombre } from "../lib/db/tipoVehiculo";
import { ejecutarTransaccion } from "../lib/db/transaccion";
import { asegurarVehiculoPorPatente } from "../lib/db/vehiculo";

const nombresSectores = [
  "Desarme",
  "Reparación",
  "Preparación",
  "Pintura",
  "Armado",
  "Terminado",
] as const;

const tiposDocumentosObligatorios = [
  "DENUNCIA",
  "LATERAL_DERECHA",
  "LATERAL_IZQUIERDA",
  "FRONTAL",
  "TRASERA",
  "CERTIFICADO_COBERTURA",
] as const;

function crearDocumentos(
  prefijoId: string,
  prefijoReferencia: string,
) {
  return tiposDocumentosObligatorios.map((tipo, indice) => ({
    id: `${prefijoId}${String(indice + 1).padStart(12, "0")}`,
    tipo,
    referenciaArchivo: `seed/desarrollo/${prefijoReferencia}/${tipo.toLowerCase()}.jpg`,
  }));
}

const datosDesarrollo = {
  marca: { nombre: "Marca Demo LuqGarage" },
  modelo: { nombre: "Modelo Ficticio" },
  tipoVehiculo: { nombre: "Automóvil Demo" },
  provincia: { nombre: "Provincia Demo" },
  localidad: { nombre: "Localidad Demo" },
  reparacion: { nombre: "Reparación Demo de Chapa" },
  repuesto: { nombre: "Repuesto Demo" },
  aseguradora: {
    nombre: "Aseguradora Ficticia",
    cuit: "00-00000000-0",
    telefono: "0000000000",
    email: "aseguradora.seed@luqgarage.invalid",
    direccion: "Dirección ficticia de seed 100",
  },
  cliente: {
    nombre: "Cliente",
    apellido: "Ficticio",
    dni: "00000000",
    telefono: "0000000001",
    email: "cliente.seed@luqgarage.invalid",
    direccion: "Dirección ficticia de seed 200",
  },
  vehiculo: { patente: "SEED000" },
  flujoValido: {
    siniestro: {
      numeroSiniestro: "SIN-SEED-VALIDO-001",
      fechaSiniestro: new Date("2026-03-01T12:00:00.000Z"),
      fechaRegistro: new Date("2026-03-02T12:00:00.000Z"),
      numeroPoliza: "POL-SEED-001",
    },
    documentos: crearDocumentos(
      "20000000-0000-4000-8000-",
      "siniestro-valido",
    ),
    presupuesto: {
      numeroPresupuesto: "PRES-SEED-001",
      costoReparacion: "150000.00",
      cantidadRepuesto: 2,
      detalleReparacionId: "50000000-0000-4000-8000-000000000001",
      detalleRepuestoId: "50000000-0000-4000-8000-000000000002",
    },
    ordenTrabajo: {
      id: "40000000-0000-4000-8000-000000000001",
      ordenTrabajoSectorId: "60000000-0000-4000-8000-000000000001",
      observacionSector: "Observación ficticia del seed",
    },
  },
};

async function main() {
  await ejecutarTransaccion(async (cliente) => {
    const sectores = [];

    for (const nombre of nombresSectores) {
      sectores.push(await asegurarSectorPorNombre(cliente, nombre));
    }

    const sectorReparacion = sectores.find(
      ({ nombre }) => nombre === "Reparación",
    );

    if (!sectorReparacion) {
      throw new Error("No se pudo asegurar el sector Reparación");
    }

    const marca = await asegurarMarcaPorNombre(
      cliente,
      datosDesarrollo.marca.nombre,
    );
    const modelo = await asegurarModeloPorMarcaYNombre(
      cliente,
      marca.id,
      datosDesarrollo.modelo.nombre,
    );
    const tipoVehiculo = await asegurarTipoVehiculoPorNombre(
      cliente,
      datosDesarrollo.tipoVehiculo.nombre,
    );
    const provincia = await asegurarProvinciaPorNombre(
      cliente,
      datosDesarrollo.provincia.nombre,
    );
    const localidad = await asegurarLocalidadPorProvinciaYNombre(
      cliente,
      provincia.id,
      datosDesarrollo.localidad.nombre,
    );
    const reparacion = await asegurarReparacionPorNombre(
      cliente,
      datosDesarrollo.reparacion.nombre,
      sectorReparacion.id,
    );
    const repuesto = await asegurarRepuestoPorNombre(
      cliente,
      datosDesarrollo.repuesto.nombre,
    );
    const aseguradora = await asegurarAseguradoraPorCuit(cliente, {
      ...datosDesarrollo.aseguradora,
      activo: true,
    });
    const clienteCreado = await asegurarClientePorDni(cliente, {
      ...datosDesarrollo.cliente,
      activo: true,
      localidadId: localidad.id,
    });
    const vehiculo = await asegurarVehiculoPorPatente(cliente, {
      ...datosDesarrollo.vehiculo,
      activo: true,
      modeloId: modelo.id,
      tipoVehiculoId: tipoVehiculo.id,
    });
    const siniestroValido = await asegurarSiniestroPorNumero(cliente, {
      ...datosDesarrollo.flujoValido.siniestro,
      gradoDano: "MODERADO",
      estado: "PENDIENTE_DE_FACTURACION",
      clienteId: clienteCreado.id,
      vehiculoId: vehiculo.id,
      aseguradoraId: aseguradora.id,
    });

    for (const documento of datosDesarrollo.flujoValido.documentos) {
      await asegurarDocumentoSiniestroPorId(cliente, {
        ...documento,
        siniestroId: siniestroValido.id,
      });
    }

    const ordenTrabajo = await asegurarOrdenTrabajoPorId(cliente, {
      id: datosDesarrollo.flujoValido.ordenTrabajo.id,
      estado: "FINALIZADA",
      siniestroId: siniestroValido.id,
    });
    const presupuesto = await asegurarPresupuestoPorNumero(cliente, {
      numeroPresupuesto:
        datosDesarrollo.flujoValido.presupuesto.numeroPresupuesto,
      estado: "APROBADO",
      siniestroId: siniestroValido.id,
      ordenTrabajoId: ordenTrabajo.id,
    });

    await asegurarDetalleReparacion(cliente, {
      id: datosDesarrollo.flujoValido.presupuesto.detalleReparacionId,
      costo: datosDesarrollo.flujoValido.presupuesto.costoReparacion,
      presupuestoId: presupuesto.id,
      reparacionId: reparacion.id,
    });
    await asegurarDetalleRepuesto(cliente, {
      id: datosDesarrollo.flujoValido.presupuesto.detalleRepuestoId,
      cantidad: datosDesarrollo.flujoValido.presupuesto.cantidadRepuesto,
      presupuestoId: presupuesto.id,
      repuestoId: repuesto.id,
    });
    await asegurarOrdenTrabajoSector(cliente, {
      id: datosDesarrollo.flujoValido.ordenTrabajo.ordenTrabajoSectorId,
      observacion: datosDesarrollo.flujoValido.ordenTrabajo.observacionSector,
      ordenTrabajoId: ordenTrabajo.id,
      sectorId: sectorReparacion.id,
    });
  });

  console.log("Seed completado correctamente.");
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
