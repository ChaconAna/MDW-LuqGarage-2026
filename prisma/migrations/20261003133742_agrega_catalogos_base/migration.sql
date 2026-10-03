-- CreateTable
CREATE TABLE "Marca" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modelo" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "marcaId" UUID NOT NULL,

    CONSTRAINT "Modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoVehiculo" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provincia" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localidad" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "provinciaId" UUID NOT NULL,

    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reparacion" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "sectorId" UUID NOT NULL,

    CONSTRAINT "Reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repuesto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Repuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nombre_key" ON "Marca"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Modelo_marcaId_nombre_key" ON "Modelo"("marcaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoVehiculo_nombre_key" ON "TipoVehiculo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Provincia_nombre_key" ON "Provincia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_provinciaId_nombre_key" ON "Localidad"("provinciaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_nombre_key" ON "Sector"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Reparacion_nombre_key" ON "Reparacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Repuesto_nombre_key" ON "Repuesto"("nombre");

-- AddForeignKey
ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localidad" ADD CONSTRAINT "Localidad_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparacion" ADD CONSTRAINT "Reparacion_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
