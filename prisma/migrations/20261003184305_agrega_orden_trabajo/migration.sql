-- CreateEnum
CREATE TYPE "EstadoOrdenTrabajo" AS ENUM ('BORRADOR', 'FINALIZADA');

-- AlterTable
ALTER TABLE "Presupuesto" ADD COLUMN     "ordenTrabajoId" UUID;

-- CreateTable
CREATE TABLE "OrdenDeTrabajo" (
    "id" UUID NOT NULL,
    "estado" "EstadoOrdenTrabajo" NOT NULL DEFAULT 'BORRADOR',
    "siniestroId" UUID NOT NULL,

    CONSTRAINT "OrdenDeTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenTrabajoSector" (
    "id" UUID NOT NULL,
    "observacion" TEXT,
    "ordenTrabajoId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,

    CONSTRAINT "OrdenTrabajoSector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenDeTrabajo_siniestroId_idx" ON "OrdenDeTrabajo"("siniestroId");

-- CreateIndex
CREATE INDEX "OrdenTrabajoSector_sectorId_idx" ON "OrdenTrabajoSector"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrabajoSector_ordenTrabajoId_sectorId_key" ON "OrdenTrabajoSector"("ordenTrabajoId", "sectorId");

-- CreateIndex
CREATE INDEX "Presupuesto_ordenTrabajoId_idx" ON "Presupuesto"("ordenTrabajoId");

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "OrdenDeTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenDeTrabajo" ADD CONSTRAINT "OrdenDeTrabajo_siniestroId_fkey" FOREIGN KEY ("siniestroId") REFERENCES "Siniestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenTrabajoSector" ADD CONSTRAINT "OrdenTrabajoSector_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "OrdenDeTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenTrabajoSector" ADD CONSTRAINT "OrdenTrabajoSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
