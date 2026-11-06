"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ParametroSeleccion = "clienteId" | "vehiculoId" | "aseguradoraId";
type ParametroPagina = "clientesPage" | "vehiculosPage" | "aseguradorasPage";

export type SeleccionesValidas = Partial<Record<ParametroSeleccion, string>>;

const ContextoNavegacion = createContext<{
  pendiente: boolean;
  seleccionar: (parametro: ParametroSeleccion, id: string) => void;
  hrefPagina: (parametro: ParametroPagina, pagina: number) => string;
} | null>(null);

type NavegacionSelectoresProps = {
  seleccionesValidas: SeleccionesValidas;
  children: ReactNode;
};

export default function NavegacionSelectores({
  seleccionesValidas,
  children,
}: NavegacionSelectoresProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();

  function parametrosActuales() {
    const parametros = new URLSearchParams(searchParams.toString());
    const claves = ["clienteId", "vehiculoId", "aseguradoraId"] as const;

    for (const clave of claves) {
      const id = seleccionesValidas[clave];
      if (id) parametros.set(clave, id);
      else parametros.delete(clave);
    }

    return parametros;
  }

  function hrefPagina(parametro: ParametroPagina, pagina: number) {
    const parametros = parametrosActuales();
    if (pagina === 1) parametros.delete(parametro);
    else parametros.set(parametro, String(pagina));

    const query = parametros.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function seleccionar(parametro: ParametroSeleccion, id: string) {
    if (pendiente) return;

    const parametros = parametrosActuales();
    parametros.set(parametro, id);

    iniciarTransicion(() => {
      router.replace(`${pathname}?${parametros.toString()}`, { scroll: false });
    });
  }

  return (
    <ContextoNavegacion.Provider value={{ pendiente, seleccionar, hrefPagina }}>
      {children}
    </ContextoNavegacion.Provider>
  );
}

export function useNavegacionSelectores() {
  const contexto = useContext(ContextoNavegacion);
  if (!contexto) {
    throw new Error("El selector requiere NavegacionSelectores.");
  }
  return contexto;
}
