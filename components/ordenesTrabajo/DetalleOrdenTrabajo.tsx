import Link from "next/link";
import type { ReactNode } from "react";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import type { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";
import { clasesEnlaceTexto } from "@/lib/utils";

export default function DetalleOrdenTrabajo({ orden, esEncargado, children }: {
  orden: ReturnType<typeof serializarDetalleOrdenTrabajo>;
  esEncargado: boolean;
  children?: ReactNode;
}) {
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
    {children}
  </div></ContenedorPagina></main>;
}
