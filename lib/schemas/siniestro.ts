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

const datosSiniestroSchema = z
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
  })
  .strict();

const documentoSiniestroPersistenciaSchema = z
  .object({
    tipo: z.nativeEnum(TipoDocumentoSiniestro),
    referenciaArchivo: z.string().min(1),
  })
  .strict();

const documentoSiniestroMultipartSchema = z
  .object({
    tipo: z.nativeEnum(TipoDocumentoSiniestro),
    archivo: z.instanceof(File),
  })
  .strict();

type DocumentoSiniestroConTipo = {
  tipo: TipoDocumentoSiniestro;
};

function validarDocumentosObligatorios(
  documentos: readonly DocumentoSiniestroConTipo[],
  contexto: z.RefinementCtx,
) {
  for (const tipoObligatorio of tiposDocumentosObligatorios) {
    const cantidad = documentos.filter(
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
}

export const crearSiniestroSchema = z
  .object({
    ...datosSiniestroSchema.shape,
    documentos: z.array(documentoSiniestroPersistenciaSchema),
  })
  .strict()
  .superRefine((datos, contexto) =>
    validarDocumentosObligatorios(datos.documentos, contexto),
  );

export type DatosCreacionSiniestro = z.infer<typeof crearSiniestroSchema>;

export const crearSiniestroMultipartSchema = z
  .object({
    ...datosSiniestroSchema.shape,
    documentos: z.array(documentoSiniestroMultipartSchema),
  })
  .strict()
  .superRefine((datos, contexto) =>
    validarDocumentosObligatorios(datos.documentos, contexto),
  );

export type DatosCreacionSiniestroMultipart = z.infer<
  typeof crearSiniestroMultipartSchema
>;
