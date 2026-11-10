import Link from "next/link";
import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import ContextoSiniestroPresupuesto from "@/components/presupuestos/ContextoSiniestroPresupuesto";
import FormularioPresupuesto from "@/components/presupuestos/FormularioPresupuesto";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import { listarReparaciones } from "@/lib/db/reparacion";
import { listarRepuestos } from "@/lib/db/repuesto";
import { parametrosSiniestroSchema, type ParametrosSiniestro } from "@/lib/schemas/siniestro";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function PresupuestoNuevoPage({ params }: { params: Promise<ParametrosSiniestro> }) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para crear presupuestos.</p></ContenedorPagina></main>;
  const parametro = parametrosSiniestroSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const siniestro = await obtenerSiniestroPorId(parametro.data.id);
  if (!siniestro) notFound();
  const [reparaciones, repuestos] = await Promise.all([listarReparaciones(1, 10), listarRepuestos(1, 10)]);
  return <main><ContenedorPagina ancho="narrow"><div className="min-w-0 space-y-6">
    <Link href={`/siniestros/${siniestro.id}`} className={clasesEnlaceTexto}>Volver al siniestro</Link>
    <h1 className="text-2xl font-bold">Crear presupuesto</h1>
    <ContextoSiniestroPresupuesto siniestro={siniestro} />
    <FormularioPresupuesto siniestroId={siniestro.id} catalogoReparaciones={reparaciones} catalogoRepuestos={repuestos} />
  </div></ContenedorPagina></main>;
}
