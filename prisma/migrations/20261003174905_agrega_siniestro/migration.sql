-- CreateEnum
CREATE TYPE "GradoDano" AS ENUM ('LEVE', 'MODERADO', 'GRAVE');

-- CreateEnum
CREATE TYPE "EstadoSiniestro" AS ENUM ('REGISTRADO', 'PRESUPUESTADO', 'PENDIENTE_DE_FACTURACION');

-- CreateTable
CREATE TABLE "Siniestro" (
    "id" UUID NOT NULL,
    "numeroSiniestro" TEXT NOT NULL,
    "fechaSiniestro" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradoDano" "GradoDano" NOT NULL,
    "numeroPoliza" TEXT NOT NULL,
    "estado" "EstadoSiniestro" NOT NULL DEFAULT 'REGISTRADO',
    "clienteId" UUID NOT NULL,
    "vehiculoId" UUID NOT NULL,
    "aseguradoraId" UUID NOT NULL,

    CONSTRAINT "Siniestro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Siniestro_numeroSiniestro_key" ON "Siniestro"("numeroSiniestro");

-- CreateIndex
CREATE INDEX "Siniestro_clienteId_idx" ON "Siniestro"("clienteId");

-- CreateIndex
CREATE INDEX "Siniestro_vehiculoId_idx" ON "Siniestro"("vehiculoId");

-- CreateIndex
CREATE INDEX "Siniestro_aseguradoraId_idx" ON "Siniestro"("aseguradoraId");

-- AddForeignKey
ALTER TABLE "Siniestro" ADD CONSTRAINT "Siniestro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siniestro" ADD CONSTRAINT "Siniestro_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siniestro" ADD CONSTRAINT "Siniestro_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "Aseguradora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
