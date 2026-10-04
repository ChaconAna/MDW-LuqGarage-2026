-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" UUID NOT NULL,
    "patente" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "modeloId" UUID NOT NULL,
    "tipoVehiculoId" UUID NOT NULL,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_patente_key" ON "Vehiculo"("patente");

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_tipoVehiculoId_fkey" FOREIGN KEY ("tipoVehiculoId") REFERENCES "TipoVehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
