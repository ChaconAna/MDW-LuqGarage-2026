"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { consultarCatalogoVehiculoAction, type PaginaCatalogoVehiculo } from "@/app/(app)/vehiculos/nuevo/actions";
import { Button } from "@/components/ui/button";
import type { ConsultaCatalogoVehiculo } from "@/lib/schemas/altaVehiculo";

export type OpcionCatalogoVehiculo = PaginaCatalogoVehiculo["opciones"][number];
type SelectorCatalogoVehiculoProps = {
  tipo: ConsultaCatalogoVehiculo["tipo"];
  marcaId?: string;
  inicial: PaginaCatalogoVehiculo;
  seleccionada?: OpcionCatalogoVehiculo;
  disabled: boolean;
  error?: string;
  onSeleccionar: (opcion: OpcionCatalogoVehiculo | undefined) => void;
};
const etiquetas = { marcas: "Marca", modelos: "Modelo", tipos: "Tipo de vehículo" } as const;

export default function SelectorCatalogoVehiculo({
  tipo, marcaId, inicial, seleccionada, disabled, error, onSeleccionar,
}: SelectorCatalogoVehiculoProps) {
  const [datos, setDatos] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string>();
  const bloqueo = useRef(false);
  const etiqueta = etiquetas[tipo];
  const id = `vehiculo-${tipo}`;
  const sinMarca = tipo === "modelos" && !marcaId;
  const totalPaginas = Math.max(1, Math.ceil(datos.total / 10));

  const cargar = useCallback(async (pagina: number) => {
    if (bloqueo.current || (tipo === "modelos" && !marcaId)) return;
    bloqueo.current = true;
    setCargando(true);
    setErrorCatalogo(undefined);
    try {
      const resultado = await consultarCatalogoVehiculoAction({
        tipo, page: pagina, limit: 10, ...(tipo === "modelos" ? { marcaId } : {}),
      });
      if (resultado.ok) setDatos(resultado);
      else setErrorCatalogo(resultado.error);
    } catch {
      setErrorCatalogo("No pudimos cargar las opciones. Intentá nuevamente.");
    } finally {
      bloqueo.current = false;
      setCargando(false);
    }
  }, [tipo, marcaId]);

  useEffect(() => {
    if (tipo === "modelos" && marcaId) void cargar(1);
  }, [tipo, marcaId, cargar]);

  return (
    <section aria-label={etiqueta} aria-busy={cargando} className="min-w-0 space-y-3 rounded-lg border border-current/20 p-4">
      <label htmlFor={id} className="block font-medium">{etiqueta} (obligatorio)</label>
      <select
        id={id}
        value={seleccionada?.id ?? ""}
        required
        disabled={disabled || cargando || sinMarca}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(evento) => onSeleccionar(datos.opciones.find(({ id }) => id === evento.target.value))}
        className="h-10 w-full min-w-0 rounded-md border border-current/30 bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <option value="">Elegí una opción</option>
        {seleccionada && !datos.opciones.some(({ id }) => id === seleccionada.id) ? (
          <option value={seleccionada.id}>{seleccionada.nombre} (selección actual)</option>
        ) : null}
        {datos.opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
      </select>
      {sinMarca ? <p>Seleccioná primero una Marca para consultar sus Modelos.</p> : (
        <>
          {!cargando && !errorCatalogo && datos.total === 0 ? <p>No hay opciones disponibles para {etiqueta}.</p> : null}
          <nav aria-label={`Paginación de ${etiqueta}`} className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" disabled={disabled || cargando || datos.pagina <= 1} onClick={() => void cargar(datos.pagina - 1)}>Anterior</Button>
            <span className="text-sm">Página {datos.pagina} de {totalPaginas}</span>
            <Button type="button" variant="outline" disabled={disabled || cargando || datos.pagina >= totalPaginas} onClick={() => void cargar(datos.pagina + 1)}>Siguiente</Button>
          </nav>
        </>
      )}
      {cargando ? <p role="status">Cargando {etiqueta}…</p> : null}
      {errorCatalogo ? (
        <div className="space-y-2">
          <p role="alert">{errorCatalogo}</p>
          <Button type="button" variant="outline" disabled={disabled || cargando} onClick={() => void cargar(datos.pagina)}>Reintentar {etiqueta}</Button>
        </div>
      ) : null}
      {error ? <p id={`${id}-error`} className="text-sm">{error}</p> : null}
    </section>
  );
}
