import Link from "next/link";
import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerOrdenTrabajoPorId, obtenerOrdenTrabajoFinalizadaPorId } from "@/lib/db/ordenTrabajo";
import { parametrosOrdenTrabajoSchema } from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function OrdenTrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER", "MECANICO"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para consultar órdenes de trabajo.</p></ContenedorPagina></main>;
  const parametro = parametrosOrdenTrabajoSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const esEncargado = autorizacion.usuario.rol === "ENCARGADO_DEL_TALLER";
  const datos = await (esEncargado ? obtenerOrdenTrabajoPorId : obtenerOrdenTrabajoFinalizadaPorId)(parametro.data.id);
  if (!datos) notFound();
  const orden = serializarDetalleOrdenTrabajo(datos);
  const numeroPresupuesto = (id: string) => orden.presupuestos.find((item) => item.id === id)?.numeroPresupuesto ?? id;
  return <main><ContenedorPagina ancho="narrow"><div className="min-w-0 space-y-6 break-words">
    <Link href="/ordenes-trabajo" className={clasesEnlaceTexto}>Volver a órdenes de trabajo</Link>
    <header><h1 className="text-2xl font-bold">Orden de trabajo</h1><p className="break-all">{orden.id}</p><p>Estado: {orden.estado}</p></header>
    <p>Siniestro: {esEncargado ? <Link href={`/siniestros/${orden.siniestro.id}`} className={clasesEnlaceTexto}>{orden.siniestro.numeroSiniestro}</Link> : orden.siniestro.numeroSiniestro}</p>
    <section aria-labelledby="presupuestos-orden" className="space-y-3">
      <h2 id="presupuestos-orden" className="text-xl font-semibold">Presupuestos incluidos</h2>
      <ul>{orden.presupuestos.map((item) => <li key={item.id}>{esEncargado ? <Link className={clasesEnlaceTexto} href={`/presupuestos/${item.id}`}>Presupuesto {item.numeroPresupuesto}</Link> : `Presupuesto ${item.numeroPresupuesto}`}</li>)}</ul>
    </section>
    <section aria-labelledby="sectores-orden" className="space-y-4">
      <h2 id="sectores-orden" className="text-xl font-semibold">Sectores y tareas</h2>
      {orden.sectores.length === 0 ? <p>No hay sectores asociados.</p> : orden.sectores.map((sector) => <section key={sector.id} aria-labelledby={`sector-${sector.id}`} className="space-y-3 rounded-lg border border-current/20 p-4">
        <h3 id={`sector-${sector.id}`} className="font-semibold">{sector.nombre}</h3>
        <p className="whitespace-pre-wrap">Observación: {sector.observacion ?? "Sin observaciones."}</p>
        <ul className="space-y-3">{sector.reparaciones.map((tarea) => <li key={tarea.detalleReparacionId}>
          <p>{tarea.reparacion.nombre}</p><p className="text-sm">Procedencia: Presupuesto {numeroPresupuesto(tarea.presupuestoId)}</p>
        </li>)}</ul>
      </section>)}
    </section>
  </div></ContenedorPagina></main>;
}
