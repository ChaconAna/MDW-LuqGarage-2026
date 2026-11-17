import Link from "next/link";
import { notFound } from "next/navigation";

import FormularioCliente from "@/components/clientes/FormularioCliente";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerClientePorId } from "@/lib/db/cliente";
import { listarLocalidades } from "@/lib/db/localidad";
import { parametrosClienteSchema, type ParametrosCliente } from "@/lib/schemas/cliente";
import { clasesEnlaceTexto } from "@/lib/utils";

import { actualizarClienteAction } from "./actions";

type ClienteEditarPageProps = {
  params: Promise<ParametrosCliente>;
};

export default async function ClienteEditarPage({ params }: ClienteEditarPageProps) {
  const autorizacion = await autorizarPagina(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para editar clientes.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const parametros = parametrosClienteSchema.safeParse(await params);
  if (!parametros.success) notFound();
  const cliente = await obtenerClientePorId(parametros.data.id);
  if (!cliente) notFound();

  const localidades = await listarLocalidades(1, 10);
  const hrefDetalle = `/clientes/${cliente.id}`;

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="min-w-0 space-y-6">
          <Link href={hrefDetalle} className={`${clasesEnlaceTexto} inline-block text-sm`}>
            Volver al detalle
          </Link>
          <h1 className="text-2xl font-bold">Editar cliente</h1>
          <FormularioCliente
            localidadesIniciales={{ ...localidades, pagina: 1, busqueda: "" }}
            datosIniciales={{
              nombre: cliente.nombre,
              apellido: cliente.apellido,
              dni: cliente.dni,
              telefono: cliente.telefono,
              email: cliente.email,
              direccion: cliente.direccion,
            }}
            localidadInicial={cliente.localidad}
            guardarAction={actualizarClienteAction.bind(null, cliente.id)}
            hrefCancelar={hrefDetalle}
          />
        </div>
      </ContenedorPagina>
    </main>
  );
}
