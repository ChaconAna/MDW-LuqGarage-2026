-- CreateEnum
CREATE TYPE "TipoDocumentoSiniestro" AS ENUM ('DENUNCIA', 'LATERAL_DERECHA', 'LATERAL_IZQUIERDA', 'FRONTAL', 'TRASERA', 'CERTIFICADO_COBERTURA', 'ADICIONAL');

-- CreateTable
CREATE TABLE "DocumentoSiniestro" (
    "id" UUID NOT NULL,
    "tipo" "TipoDocumentoSiniestro" NOT NULL,
    "referenciaArchivo" TEXT NOT NULL,
    "siniestroId" UUID NOT NULL,

    CONSTRAINT "DocumentoSiniestro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoSiniestro_siniestroId_idx" ON "DocumentoSiniestro"("siniestroId");

-- AddForeignKey
ALTER TABLE "DocumentoSiniestro" ADD CONSTRAINT "DocumentoSiniestro_siniestroId_fkey" FOREIGN KEY ("siniestroId") REFERENCES "Siniestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
