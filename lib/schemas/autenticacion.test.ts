import { describe, expect, it } from "vitest";

import { perfilGoogleSchema } from "./autenticacion";

function crearPerfilValido() {
  return {
    sub: "google-sub-123",
    email: "persona@ejemplo.com",
    email_verified: true,
  };
}

describe("perfilGoogleSchema", () => {
  it("acepta un perfil Google con email verificado", () => {
    expect(perfilGoogleSchema.safeParse(crearPerfilValido()).success).toBe(true);
  });

  it("rechaza un perfil Google con email no verificado", () => {
    expect(
      perfilGoogleSchema.safeParse({
        ...crearPerfilValido(),
        email_verified: false,
      }).success,
    ).toBe(false);
  });

  it("rechaza un perfil Google sin sub", () => {
    const perfil = crearPerfilValido();
    const perfilSinSub = {
      email: perfil.email,
      email_verified: perfil.email_verified,
    };

    expect(perfilGoogleSchema.safeParse(perfilSinSub).success).toBe(false);
  });

  it("rechaza un perfil Google con email inválido", () => {
    expect(
      perfilGoogleSchema.safeParse({
        ...crearPerfilValido(),
        email: "email-invalido",
      }).success,
    ).toBe(false);
  });
});
