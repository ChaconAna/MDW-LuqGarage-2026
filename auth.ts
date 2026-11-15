import { createHash, timingSafeEqual } from "node:crypto";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  autorizarInicioSesionGoogle,
  obtenerUsuarioParaAutorizacionPorId,
  obtenerUsuarioParaSesionPorGoogleSub,
} from "@/lib/db/usuario";
import { perfilGoogleSchema } from "@/lib/schemas/autenticacion";
import {
  credencialesAutenticacionE2eSchema,
  validarEntornoAutenticacionE2e,
} from "@/lib/schemas/entornoE2e";

const autenticacionE2eHabilitada = validarEntornoAutenticacionE2e(process.env);
const configuracionE2e = autenticacionE2eHabilitada
  ? {
      credencial: process.env.AUTENTICACION_E2E_CREDENCIAL!,
      usuarioId: process.env.AUTENTICACION_E2E_USUARIO_ID!,
    }
  : null;

function credencialesCoinciden(recibida: string, esperada: string) {
  const hashRecibido = createHash("sha256").update(recibida).digest();
  const hashEsperado = createHash("sha256").update(esperada).digest();

  return timingSafeEqual(hashRecibido, hashEsperado);
}

const proveedorE2e = configuracionE2e
  ? Credentials({
      id: "e2e",
      name: "Autenticación E2E",
      credentials: {
        credencial: {
          label: "Credencial E2E",
          type: "password",
        },
      },
      async authorize(credenciales) {
        const entrada = credencialesAutenticacionE2eSchema.safeParse(credenciales);

        if (
          !entrada.success ||
          !credencialesCoinciden(
            entrada.data.credencial,
            configuracionE2e.credencial,
          )
        ) {
          return null;
        }

        const usuario = await obtenerUsuarioParaAutorizacionPorId(
          configuracionE2e.usuarioId,
        );

        if (!usuario || !usuario.activo) {
          return null;
        }

        return { id: usuario.id };
      },
    })
  : null;

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: proveedorE2e ? [Google, proveedorE2e] : [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "e2e") {
        return configuracionE2e !== null && user.id === configuracionE2e.usuarioId;
      }

      const perfil = perfilGoogleSchema.safeParse(profile);

      if (!perfil.success) {
        return false;
      }

      return autorizarInicioSesionGoogle({
        googleSub: perfil.data.sub,
        email: perfil.data.email.toLowerCase(),
      });
    },
    async jwt({ account, profile, token, trigger, user }) {
      if (trigger !== "signIn") {
        if (typeof token.usuarioId !== "string" || !token.rol) {
          return null;
        }

        return token;
      }

      if (account?.provider === "e2e") {
        if (
          !configuracionE2e ||
          typeof user.id !== "string" ||
          user.id !== configuracionE2e.usuarioId
        ) {
          return null;
        }

        const usuario = await obtenerUsuarioParaAutorizacionPorId(user.id);

        if (!usuario || !usuario.activo) {
          return null;
        }

        return {
          ...token,
          usuarioId: usuario.id,
          rol: usuario.rol,
        };
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
