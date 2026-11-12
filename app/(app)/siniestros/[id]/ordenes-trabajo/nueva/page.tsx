import Link from "next/link";
import { notFound } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import FormularioOrdenTrabajo from "@/components/ordenesTrabajo/FormularioOrdenTrabajo";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import { listarPresupuestosAprobadosDisponibles } from "@/lib/db/presupuesto";
import { parametrosSiniestroSchema } from "@/lib/schemas/siniestro";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function NuevaOrdenTrabajoPage({ params }: { params: Promise<{ id: string }> }) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para crear órdenes de trabajo.</p></ContenedorPagina></main>;
  const parametro = parametrosSiniestroSchema.safeParse(await params);
  if (!parametro.success) notFound();
  const siniestro = await obtenerSiniestroPorId(parametro.data.id);
  if (!siniestro) notFound();
  const inicial = await listarPresupuestosAprobadosDisponibles(siniestro.id, 1, 10);
  return <main><ContenedorPagina ancho="narrow"><div className="space-y-6">
    <Link href={`/siniestros/${siniestro.id}`} className={clasesEnlaceTexto}>Volver al siniestro</Link>
    <header><h1 className="text-2xl font-bold">Crear orden de trabajo</h1><p className="break-words">Siniestro {siniestro.numeroSiniestro}</p><p>La orden se creará en estado BORRADOR.</p></header>
    <FormularioOrdenTrabajo siniestroId={siniestro.id} inicial={inicial} />
  </div></ContenedorPagina></main>;
}
