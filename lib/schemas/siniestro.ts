import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { z } from "zod";

const tiposDocumentosObligatorios = [
  TipoDocumentoSiniestro.DENUNCIA,
  TipoDocumentoSiniestro.LATERAL_DERECHA,
  TipoDocumentoSiniestro.LATERAL_IZQUIERDA,
  TipoDocumentoSiniestro.FRONTAL,
  TipoDocumentoSiniestro.TRASERA,
  TipoDocumentoSiniestro.CERTIFICADO_COBERTURA,
] as const;

export const parametrosSiniestroSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosSiniestro = z.infer<typeof parametrosSiniestroSchema>;

export const listadoSiniestrosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const documentoSiniestroSchema = z
  .object({
    tipo: z.nativeEnum(TipoDocumentoSiniestro),
    referenciaArchivo: z.string().min(1),
  })
  .strict();

export const crearSiniestroSchema = z
  .object({
    numeroSiniestro: z.string().min(1),
    fechaSiniestro: z
      .string()
      .datetime({ offset: true })
      .transform((fecha) => new Date(fecha)),
    gradoDano: z.nativeEnum(GradoDano),
    numeroPoliza: z.string().min(1),
    clienteId: z.string().uuid(),
    vehiculoId: z.string().uuid(),
    aseguradoraId: z.string().uuid(),
    documentos: z.array(documentoSiniestroSchema),
  })
  .strict()
  .superRefine((datos, contexto) => {
    for (const tipoObligatorio of tiposDocumentosObligatorios) {
      const cantidad = datos.documentos.filter(
        ({ tipo }) => tipo === tipoObligatorio,
      ).length;

      if (cantidad !== 1) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documentos"],
          message: `Debe incluir exactamente un documento ${tipoObligatorio}.`,
        });
      }
    }
  });

export type DatosCreacionSiniestro = z.infer<typeof crearSiniestroSchema>;
