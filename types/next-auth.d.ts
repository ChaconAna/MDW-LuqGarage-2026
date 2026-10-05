import type { RolUsuario } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      usuarioId: string;
      rol: RolUsuario;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    usuarioId?: string;
    rol?: RolUsuario;
  }
}
