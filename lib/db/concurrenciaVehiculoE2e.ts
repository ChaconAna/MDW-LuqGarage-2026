import { randomUUID } from "node:crypto";

import { manifiestoConcurrenciaVehiculoE2eSchema } from "../schemas/concurrenciaVehiculoE2e";
import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";
import { validarEntornoPruebas } from "../schemas/entornoPruebas";
import { crearVehiculoSchema } from "../schemas/vehiculo";

// Helper exclusivo del E2E: no crea infraestructura ni datos de catálogo.
export async function prepararConcurrenciaVehiculoE2e() {
  if (
    process.env.PRUEBAS_PERSISTENCIA !== "1" ||
    !validarEntornoAutenticacionE2e(process.env)
  ) {
    throw new Error("La concurrencia de vehículos requiere el entorno E2E de CI.");
  }
  validarEntornoPruebas(process.env);

  const serializado = process.env.FLUJO_PRINCIPAL_E2E_MANIFIESTO;
  if (!serializado) throw new Error("No se preparó el manifiesto E2E.");
  const manifiesto = manifiestoConcurrenciaVehiculoE2eSchema.parse(
    JSON.parse(serializado),
  );
  if (manifiesto.ejecucionId !== process.env.AUTENTICACION_E2E_USUARIO_ID) {
    throw new Error("El manifiesto no pertenece a la ejecución E2E actual.");
  }

  const datos = crearVehiculoSchema.parse({
    patente: `E2E-CONC-${randomUUID()}`,
    modeloId: manifiesto.modelo.id,
    tipoVehiculoId: manifiesto.tipoVehiculo.id,
  });

  // Importar el cliente solo después de validar el aislamiento, sin cargar dotenv.
  const { prisma } = await import("./client");
  const contar = () => prisma.vehiculo.count({ where: { patente: datos.patente } });
  try {
    if (await contar() !== 0) {
      throw new Error("La patente de prueba ya existe; no se modificará.");
    }
  } catch (error: unknown) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    datos,
    contar,
    async limpiar() {
      try {
        // Compensación del fixture sintético, nunca baja de un vehículo de negocio.
        await prisma.vehiculo.deleteMany({
          where: { ...datos, activo: true, siniestros: { none: {} } },
        });
        if (await contar() !== 0) {
          throw new Error("No se pudo limpiar el vehículo de concurrencia E2E.");
        }
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
