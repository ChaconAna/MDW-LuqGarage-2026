import type { obtenerSiniestroPorId } from "@/lib/db/siniestro";

type ContextoSiniestroPresupuestoProps = {
  siniestro: NonNullable<Awaited<ReturnType<typeof obtenerSiniestroPorId>>>;
};

export default function ContextoSiniestroPresupuesto({ siniestro }: ContextoSiniestroPresupuestoProps) {
  return (
    <section aria-label="Siniestro asociado" className="min-w-0 space-y-2 rounded-lg border border-current/20 p-4">
      <h2 className="text-lg font-semibold">Siniestro {siniestro.numeroSiniestro}</h2>
      <p className="break-words">Cliente: {siniestro.cliente.nombre} {siniestro.cliente.apellido}</p>
      <p className="break-words">Vehículo: {siniestro.vehiculo.patente} · {siniestro.vehiculo.modelo.marca.nombre} {siniestro.vehiculo.modelo.nombre}</p>
      <p className="break-words">Aseguradora: {siniestro.aseguradora.nombre}</p>
      <p className="text-sm">Estos datos pertenecen al siniestro y no se modifican desde el presupuesto.</p>
    </section>
  );
}
