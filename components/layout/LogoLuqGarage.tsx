import Image from "next/image";

const clasesPorTamano = {
  encabezado: "w-24",
  login: "w-48",
} as const;

type LogoLuqGarageProps = {
  tamano?: keyof typeof clasesPorTamano;
};

export default function LogoLuqGarage({
  tamano = "encabezado",
}: LogoLuqGarageProps) {
  return (
    <Image
      src="/logo-luqgarage.png"
      alt="LuqGarage"
      width={270}
      height={203}
      priority
      className={`h-auto max-w-full shrink-0 object-contain ${clasesPorTamano[tamano]}`}
    />
  );
}
