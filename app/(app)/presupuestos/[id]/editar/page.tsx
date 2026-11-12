import Link from "next/link";
import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import FormularioPresupuesto from "@/components/presupuestos/FormularioPresupuesto";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerPresupuestoPorId } from "@/lib/db/presupuesto";
import { listarReparaciones } from "@/lib/db/reparacion";
import { listarRepuestos } from "@/lib/db/repuesto";
import { parametrosPresupuestoSchema, type ParametrosPresupuesto } from "@/lib/schemas/presupuesto";
import { puedeEditarPresupuesto, serializarDetallePresupuesto } from "@/lib/services/presupuesto";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function PresupuestoEditarPage({ params }: { params: Promise<ParametrosPresupuesto> }) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para editar presupuestos.</p></ContenedorPagina></main>;
  const parametro = parametrosPresupuestoSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const presupuesto = await obtenerPresupuestoPorId(parametro.data.id);
  if (!presupuesto) notFound();
  const volver = <Link href={`/presupuestos/${presupuesto.id}`} className={clasesEnlaceTexto}>Volver al presupuesto</Link>;
  if (!puedeEditarPresupuesto(presupuesto.estado)) return <main><ContenedorPagina ancho="narrow"><div className="space-y-4">{volver}<h1 className="text-2xl font-bold">Presupuesto no editable</h1><p>El presupuesto ya no está en BORRADOR. Estado actual: {presupuesto.estado}.</p></div></ContenedorPagina></main>;
  const [reparaciones, repuestos] = await Promise.all([listarReparaciones(1, 10), listarRepuestos(1, 10)]);
  return <main><ContenedorPagina ancho="narrow"><div className="min-w-0 space-y-6">
    {volver}
    <h1 className="text-2xl font-bold">Editar presupuesto BORRADOR</h1>
    <p className="break-words">Siniestro asociado: {presupuesto.siniestro.numeroSiniestro}. Esta asociación no puede modificarse.</p>
    <FormularioPresupuesto inicial={serializarDetallePresupuesto(presupuesto)} catalogoReparaciones={reparaciones} catalogoRepuestos={repuestos} />
  </div></ContenedorPagina></main>;
}
