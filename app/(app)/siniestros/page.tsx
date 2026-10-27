import TablaSiniestros from "@/components/siniestros/TablaSiniestros";
import { autorizarPagina } from "@/lib/authPagina";
import { listarSiniestros } from "@/lib/db/siniestro";
import { listadoSiniestrosQuerySchema } from "@/lib/schemas/siniestro";

export default async function SiniestrosPage() {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main className="mx-auto max-w-6xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3">No tenés permisos para consultar siniestros.</p>
      </main>
    );
  }

  const { page, limit } = listadoSiniestrosQuerySchema.parse({});
  const { siniestros, total } = await listarSiniestros(page, limit);

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Siniestros</h1>

      {siniestros.length === 0 ? (
        <p className="mt-6 rounded-lg border border-current/20 p-6">
          No hay siniestros registrados.
        </p>
      ) : (
        <TablaSiniestros
          siniestros={siniestros.map((siniestro) => ({
            id: siniestro.id,
            numeroSiniestro: siniestro.numeroSiniestro,
            cliente: `${siniestro.cliente.nombre} ${siniestro.cliente.apellido}`,
            patente: siniestro.vehiculo.patente,
            aseguradora: siniestro.aseguradora.nombre,
            gradoDano: siniestro.gradoDano,
            estado: siniestro.estado,
          }))}
          total={total}
        />
      )}
    </main>
  );
}
