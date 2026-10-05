import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { autorizarInicioSesionGoogle } from "@/lib/db/usuario";
import { perfilGoogleSchema } from "@/lib/schemas/autenticacion";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const perfil = perfilGoogleSchema.safeParse(profile);

      if (!perfil.success) {
        return false;
      }

      return autorizarInicioSesionGoogle({
        googleSub: perfil.data.sub,
        email: perfil.data.email.toLowerCase(),
      });
    },
  },
});
