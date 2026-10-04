import type { ClienteTransaccion } from "./transaccion";

type DatosOrdenTrabajoSector = {
  id: string;
  observacion: string | null;
  ordenTrabajoId: string;
  sectorId: string;
};

export function asegurarOrdenTrabajoSector(
  cliente: ClienteTransaccion,
  datos: DatosOrdenTrabajoSector,
) {
  return cliente.ordenTrabajoSector.upsert({
    where: {
      ordenTrabajoId_sectorId: {
        ordenTrabajoId: datos.ordenTrabajoId,
        sectorId: datos.sectorId,
      },
    },
    update: { observacion: datos.observacion },
    create: datos,
  });
}
