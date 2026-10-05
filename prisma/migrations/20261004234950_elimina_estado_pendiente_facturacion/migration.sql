/*
  Warnings:

  - The values [PENDIENTE_DE_FACTURACION] on the enum `EstadoSiniestro` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
UPDATE "public"."Siniestro"
SET "estado" = 'PRESUPUESTADO'
WHERE "estado" = 'PENDIENTE_DE_FACTURACION';
CREATE TYPE "EstadoSiniestro_new" AS ENUM ('REGISTRADO', 'PRESUPUESTADO');
ALTER TABLE "public"."Siniestro" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Siniestro" ALTER COLUMN "estado" TYPE "EstadoSiniestro_new" USING ("estado"::text::"EstadoSiniestro_new");
ALTER TYPE "EstadoSiniestro" RENAME TO "EstadoSiniestro_old";
ALTER TYPE "EstadoSiniestro_new" RENAME TO "EstadoSiniestro";
DROP TYPE "public"."EstadoSiniestro_old";
ALTER TABLE "Siniestro" ALTER COLUMN "estado" SET DEFAULT 'REGISTRADO';
COMMIT;
