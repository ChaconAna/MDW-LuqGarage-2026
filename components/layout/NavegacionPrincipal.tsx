"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

export type EnlaceNavegacion = {
  href: "/siniestros" | "/clientes" | "/vehiculos" | "/ordenes-trabajo" | "/sistema";
  etiqueta: string;
};

type NavegacionPrincipalProps = {
  enlaces: readonly EnlaceNavegacion[];
};

export default function NavegacionPrincipal({ enlaces }: NavegacionPrincipalProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal">
      <ul className="flex flex-wrap items-stretch gap-2">
        {enlaces.map(({ href, etiqueta }, indice) => {
          const paginaActual = pathname === href;
          const seccionActiva = paginaActual || pathname.startsWith(`${href}/`);

          return (
            <li
              key={href}
              className={`min-w-0 max-w-full ${href === "/sistema" && indice > 0 ? "border-l border-border pl-2 sm:ml-auto" : ""}`}
            >
              <Button
                asChild
                variant="ghost"
                className={`h-auto min-h-11 max-w-full whitespace-normal border-b-2 px-3 py-2 text-left ${seccionActiva ? "border-b-link bg-muted font-semibold text-link hover:text-link" : "border-b-transparent text-foreground"}`}
              >
                <Link href={href} aria-current={paginaActual ? "page" : seccionActiva ? "location" : undefined}>
                  {etiqueta}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
