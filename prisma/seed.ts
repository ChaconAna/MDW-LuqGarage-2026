/**
 * Punto de entrada del seed de desarrollo.
 *
 * Correr con: npm run db:seed
 */
import { prisma } from "../lib/db/client";
import { asegurarSectorPorNombre } from "../lib/db/sector";

const nombresSectores = [
  "Desarme",
  "Reparación",
  "Preparación",
  "Pintura",
  "Armado",
  "Terminado",
] as const;

async function main() {
  for (const nombre of nombresSectores) {
    await asegurarSectorPorNombre(nombre);
  }
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
