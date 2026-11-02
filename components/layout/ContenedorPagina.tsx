import type { ReactNode } from "react";

const clasesPorAncho = {
  wide: "max-w-6xl",
  narrow: "max-w-4xl",
} as const;

type ContenedorPaginaProps = {
  children: ReactNode;
  ancho?: keyof typeof clasesPorAncho;
};

export default function ContenedorPagina({
  children,
  ancho = "wide",
}: ContenedorPaginaProps) {
  return (
    <div className={`mx-auto ${clasesPorAncho[ancho]} p-6 sm:p-8`}>
      {children}
    </div>
  );
}
