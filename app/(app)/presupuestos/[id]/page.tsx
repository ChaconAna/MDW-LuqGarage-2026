import Link from "next/link";
import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerPresupuestoPorId } from "@/lib/db/presupuesto";
import { parametrosPresupuestoSchema, type ParametrosPresupuesto } from "@/lib/schemas/presupuesto";
import { puedeEditarPresupuesto, serializarDetallePresupuesto } from "@/lib/services/presupuesto";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function PresupuestoDetallePage({ params }: { params: Promise<ParametrosPresupuesto> }) {
  const autorizacion = await autorizarPagina(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para consultar presupuestos.</p></ContenedorPagina></main>;
  const parametro = parametrosPresupuestoSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const registro = await obtenerPresupuestoPorId(parametro.data.id);
  if (!registro) notFound();
  const presupuesto = serializarDetallePresupuesto(registro);
  return <main><ContenedorPagina ancho="narrow"><div className="min-w-0 space-y-6">
    <Link href={`/siniestros/${presupuesto.siniestro.id}`} className={clasesEnlaceTexto}>Volver al siniestro {presupuesto.siniestro.numeroSiniestro}</Link>
    <h1 className="break-words text-2xl font-bold">Presupuesto {presupuesto.numeroPresupuesto}</h1>
    <p>Estado: {presupuesto.estado}</p>
    {autorizacion.usuario.rol === "ENCARGADO_DEL_TALLER" && puedeEditarPresupuesto(presupuesto.estado) ? <Link href={`/presupuestos/${presupuesto.id}/editar`} className={`${clasesEnlaceTexto} inline-block`}>Editar borrador</Link> : null}
    <section aria-labelledby="reparaciones-presupuesto" className="space-y-3">
      <h2 id="reparaciones-presupuesto" className="text-xl font-semibold">Reparaciones</h2>
      <ul className="space-y-2">{presupuesto.reparaciones.map((detalle) => <li key={detalle.id} className="break-words">{detalle.reparacion.nombre}: {detalle.costo}</li>)}</ul>
    </section>
    <section aria-labelledby="repuestos-presupuesto" className="space-y-3">
      <h2 id="repuestos-presupuesto" className="text-xl font-semibold">Repuestos</h2>
      {presupuesto.repuestos.length === 0 ? <p>Sin repuestos.</p> : <ul className="space-y-2">{presupuesto.repuestos.map((detalle) => <li key={detalle.id} className="break-words">{detalle.repuesto.nombre}: {detalle.cantidad} unidades</li>)}</ul>}
    </section>
    <p className="font-semibold">Total de reparaciones: {presupuesto.total}</p>
    <p className="text-sm">Los repuestos no integran el total.</p>
  </div></ContenedorPagina></main>;
}
