/**
 * Único lugar del proyecto donde se instancia Prisma.
 *
 * En desarrollo, Next.js recarga los módulos en cada cambio. Si creáramos un
 * PrismaClient nuevo en cada recarga, terminaríamos con decenas de conexiones
 * abiertas y Postgres empezaría a rechazarlas. Por eso lo guardamos en el
 * objeto global: en desarrollo se reutiliza, en producción se crea una sola vez.
 */
import { PrismaClient } from "@prisma/client";
import { validarEntornoPruebas } from "../schemas/entornoPruebas";

validarEntornoPruebas(process.env);
const pruebasPersistencia = process.env.PRUEBAS_PERSISTENCIA === "1";

const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// En pruebas, fijar el destino validado sin heredar una instancia de otro entorno.
export const prisma = pruebasPersistencia
  ? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  : globalParaPrisma.prisma ?? new PrismaClient();

if (!pruebasPersistencia && process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
