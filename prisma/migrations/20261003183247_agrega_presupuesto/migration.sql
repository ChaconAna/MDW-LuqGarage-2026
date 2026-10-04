-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" UUID NOT NULL,
    "numeroPresupuesto" TEXT NOT NULL,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "siniestroId" UUID NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleReparacion" (
    "id" UUID NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "presupuestoId" UUID NOT NULL,
    "reparacionId" UUID NOT NULL,

    CONSTRAINT "DetalleReparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRepuesto" (
    "id" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "presupuestoId" UUID NOT NULL,
    "repuestoId" UUID NOT NULL,

    CONSTRAINT "DetalleRepuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_numeroPresupuesto_key" ON "Presupuesto"("numeroPresupuesto");

-- CreateIndex
CREATE INDEX "Presupuesto_siniestroId_idx" ON "Presupuesto"("siniestroId");

-- CreateIndex
CREATE INDEX "DetalleReparacion_reparacionId_idx" ON "DetalleReparacion"("reparacionId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleReparacion_presupuestoId_reparacionId_key" ON "DetalleReparacion"("presupuestoId", "reparacionId");

-- CreateIndex
CREATE INDEX "DetalleRepuesto_repuestoId_idx" ON "DetalleRepuesto"("repuestoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleRepuesto_presupuestoId_repuestoId_key" ON "DetalleRepuesto"("presupuestoId", "repuestoId");

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_siniestroId_fkey" FOREIGN KEY ("siniestroId") REFERENCES "Siniestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReparacion" ADD CONSTRAINT "DetalleReparacion_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleReparacion" ADD CONSTRAINT "DetalleReparacion_reparacionId_fkey" FOREIGN KEY ("reparacionId") REFERENCES "Reparacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRepuesto" ADD CONSTRAINT "DetalleRepuesto_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRepuesto" ADD CONSTRAINT "DetalleRepuesto_repuestoId_fkey" FOREIGN KEY ("repuestoId") REFERENCES "Repuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
