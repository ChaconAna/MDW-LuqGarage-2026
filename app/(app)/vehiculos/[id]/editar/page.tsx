import { notFound } from "next/navigation";
import { obtenerVehiculoPorId } from "@/lib/db/vehiculo";
import { parametrosVehiculoSchema, type ParametrosVehiculo } from "@/lib/schemas/vehiculo";
import { actualizarVehiculoAction } from "./actions";
import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import FormularioVehiculo from "@/components/vehiculos/FormularioVehiculo";
import { autorizarPagina } from "@/lib/authPagina";
import { listarMarcas } from "@/lib/db/marca";
import { listarTiposVehiculo } from "@/lib/db/tipoVehiculo";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function VehiculoEditarPage({ params }: { params: Promise<ParametrosVehiculo> }) {
  const autorizacion = await autorizarPagina(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para editar vehículos.</p>
        </ContenedorPagina>
      </main>
    );
  }
  const parametros = parametrosVehiculoSchema.safeParse(await params);
  if (!parametros.success) notFound();
  const vehiculo = await obtenerVehiculoPorId(parametros.data.id);
  if (!vehiculo) notFound();
  const [marcas, tipos] = await Promise.all([listarMarcas(1, 10), listarTiposVehiculo(1, 10)]);
  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="min-w-0 space-y-6">
          <Link href={`/vehiculos/${vehiculo.id}`} className={`${clasesEnlaceTexto} inline-block text-sm`}>Volver al detalle</Link>
          <h1 className="text-2xl font-bold">Editar vehículo</h1>
          <FormularioVehiculo vehiculoInicial={vehiculo} guardarAction={actualizarVehiculoAction.bind(null, vehiculo.id)} hrefCancelar={`/vehiculos/${vehiculo.id}`} marcasIniciales={{ ...marcas, pagina: 1 }} tiposIniciales={{ ...tipos, pagina: 1 }} />
        </div>
      </ContenedorPagina>
    </main>
  );
}
