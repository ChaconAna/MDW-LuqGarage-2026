import type { ReactNode } from "react";

type SeccionDetalleSiniestroProps = {
  idTitulo: string;
  titulo: string;
  children: ReactNode;
};

export default function SeccionDetalleSiniestro({
  idTitulo,
  titulo,
  children,
}: SeccionDetalleSiniestroProps) {
  return (
    <section
      aria-labelledby={idTitulo}
      className="rounded-lg border border-current/20 p-5"
    >
      <h2 id={idTitulo} className="text-lg font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}
