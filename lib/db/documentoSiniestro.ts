import type { TipoDocumentoSiniestro } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

type DatosDocumentoSiniestro = {
  id: string;
  tipo: TipoDocumentoSiniestro;
  referenciaArchivo: string;
  siniestroId: string;
};

export function asegurarDocumentoSiniestroPorId(
  cliente: ClienteTransaccion,
  datos: DatosDocumentoSiniestro,
) {
  return cliente.documentoSiniestro.upsert({
    where: { id: datos.id },
    update: datos,
    create: datos,
  });
}
