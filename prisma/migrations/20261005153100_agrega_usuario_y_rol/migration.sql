-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('RECEPCIONISTA', 'ENCARGADO_DEL_TALLER', 'MECANICO', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "googleSub" TEXT,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleSub_key" ON "Usuario"("googleSub");
