"use client";

import { useState } from "react";
import Link from "next/link";

import type { EstadoSiniestro, GradoDano } from "@prisma/client";

type SiniestroFila = {
  id: string;
  numeroSiniestro: string;
  cliente: string;
  patente: string;
  aseguradora: string;
  gradoDano: GradoDano;
  estado: EstadoSiniestro;
};

type TablaSiniestrosProps = {
  siniestros: SiniestroFila[];
  total: number;
};

export default function TablaSiniestros({
  siniestros,
  total,
}: TablaSiniestrosProps) {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim().toLocaleLowerCase("es-AR");
  const siniestrosFiltrados = siniestros.filter((siniestro) =>
    siniestro.numeroSiniestro.toLocaleLowerCase("es-AR").includes(termino),
  );

  return (
    <>
      <p className="mt-2 text-sm opacity-75">
        Cargados {siniestros.length} de {total} siniestros. El filtro busca solo
        entre los registros cargados.
      </p>

      <div className="mt-6">
        <label htmlFor="filtro-numero-siniestro" className="block text-sm font-medium">
          Filtrar por número de siniestro
        </label>
        <input
          id="filtro-numero-siniestro"
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          className="mt-2 w-full max-w-sm rounded-md border border-current/30 bg-transparent px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        />
      </div>

      <p role="status" className="mt-3 text-sm opacity-75">
        Coincidencias en los registros cargados: {siniestrosFiltrados.length} de{" "}
        {siniestros.length}.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-current/20">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Listado de siniestros</caption>
          <thead className="border-b border-current/20 bg-current/5">
            <tr>
              <th scope="col" className="px-4 py-3">
                Número de siniestro
              </th>
              <th scope="col" className="px-4 py-3">
                Cliente
              </th>
              <th scope="col" className="px-4 py-3">
                Patente
              </th>
              <th scope="col" className="px-4 py-3">
                Aseguradora
              </th>
              <th scope="col" className="px-4 py-3">
                Grado de daño
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {siniestrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">
                  No hay siniestros que coincidan con el número ingresado.
                </td>
              </tr>
            ) : (
              siniestrosFiltrados.map((siniestro) => (
                <tr
                  key={siniestro.id}
                  className="border-b border-current/10 last:border-b-0"
                >
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link
                      href={`/siniestros/${siniestro.id}`}
                      prefetch={false}
                      className="rounded-sm text-blue-700 underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-blue-300"
                    >
                      {siniestro.numeroSiniestro}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{siniestro.cliente}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {siniestro.patente}
                  </td>
                  <td className="px-4 py-3">{siniestro.aseguradora}</td>
                  <td className="px-4 py-3">{siniestro.gradoDano}</td>
                  <td className="px-4 py-3">{siniestro.estado}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
