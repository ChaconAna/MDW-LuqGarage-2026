import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import {
  autorizarInicioSesionGoogle,
  obtenerUsuarioParaSesionPorGoogleSub,
} from "@/lib/db/usuario";
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
    async jwt({ token, profile, trigger }) {
      if (trigger !== "signIn") {
        if (typeof token.usuarioId !== "string" || !token.rol) {
          return null;
        }

        return token;
      }

      const perfil = perfilGoogleSchema.safeParse(profile);

      if (!perfil.success) {
        return null;
      }

      const usuario = await obtenerUsuarioParaSesionPorGoogleSub(
        perfil.data.sub,
      );

      if (!usuario || !usuario.activo) {
        return null;
      }

      return {
        ...token,
        usuarioId: usuario.id,
        rol: usuario.rol,
      };
    },
    session({ session, token }) {
      if (typeof token.usuarioId !== "string" || !token.rol) {
        return session;
      }

      session.user = {
        ...session.user,
        usuarioId: token.usuarioId,
        rol: token.rol,
      };

      return session;
    },
  },
});
