import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerOrdenTrabajoPorId, obtenerOrdenTrabajoFinalizadaPorId } from "@/lib/db/ordenTrabajo";
import { parametrosOrdenTrabajoSchema } from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";
import DetalleOrdenTrabajo from "@/components/ordenesTrabajo/DetalleOrdenTrabajo";
import ConfeccionOrdenTrabajo from "@/components/ordenesTrabajo/ConfeccionOrdenTrabajo";
import { listarPresupuestosAprobadosDisponibles } from "@/lib/db/presupuesto";

export default async function OrdenTrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER", "MECANICO"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para consultar órdenes de trabajo.</p></ContenedorPagina></main>;
  const parametro = parametrosOrdenTrabajoSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const esEncargado = autorizacion.usuario.rol === "ENCARGADO_DEL_TALLER";
  const datos = await (esEncargado ? obtenerOrdenTrabajoPorId : obtenerOrdenTrabajoFinalizadaPorId)(parametro.data.id);
  if (!datos) notFound();
  const orden = serializarDetalleOrdenTrabajo(datos);
  if (esEncargado) {
    const catalogoInicial = orden.estado === "BORRADOR"
      ? await listarPresupuestosAprobadosDisponibles(orden.siniestro.id, 1, 10)
      : { presupuestos: [], total: 0 };
    return <ConfeccionOrdenTrabajo inicialOrden={orden} catalogoInicial={catalogoInicial} />;
  }
  return <DetalleOrdenTrabajo orden={orden} esEncargado={false} />;
}
