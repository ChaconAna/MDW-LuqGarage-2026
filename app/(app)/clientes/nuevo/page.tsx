import Link from "next/link";

import FormularioCliente from "@/components/clientes/FormularioCliente";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { listarLocalidades } from "@/lib/db/localidad";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_LOCALIDADES = 10;

export default async function ClienteNuevoPage() {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para crear clientes.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const localidades = await listarLocalidades(1, LIMITE_LOCALIDADES);

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="min-w-0 space-y-6">
          <Link
            href="/clientes"
            className={`${clasesEnlaceTexto} inline-block text-sm`}
          >
            Volver a clientes
          </Link>

          <h1 className="text-2xl font-bold">Registrar cliente</h1>

          <FormularioCliente
            localidadesIniciales={{
              ...localidades,
              pagina: 1,
              busqueda: "",
            }}
          />
        </div>
      </ContenedorPagina>
    </main>
  );
}
