# ADR 0002 — Autenticación y autorización con Google y Auth.js

**Estado:** aceptada  
**Fecha:** 2026-10-05  
**Decide:** Equipo LuqGarage

---

## Contexto

LuqGarage debe autenticar usuarios mediante Google y Auth.js, sin gestionar
contraseñas propias. La identidad autenticada no define los permisos de dominio:
estos pertenecen al Usuario local, que tiene email normalizado, `googleSub`, rol
y estado activo.

La aplicación utiliza sesión JWT. El JWT y `session.user` incluyen `usuarioId`
y rol, pero la autorización de cada operación debe considerar el Usuario local
vigente.

## Opciones consideradas

Las siguientes alternativas son relevantes para el problema; esta tabla no
documenta una evaluación histórica formal.

| Opción | A favor | En contra |
|---|---|---|
| Google mediante Auth.js, con Usuario local | Cumple la especificación y separa identidad de autorización. | Requiere mantener el Usuario local y consultar su estado vigente. |
| Contraseñas locales | No dependería de un proveedor de identidad externo. | Contradice la especificación: LuqGarage no gestiona contraseñas propias. |
| Autorizar solo con datos enviados por el cliente o claims sin revalidación | Evitaría la consulta local en cada operación. | No permite aplicar bajas ni cambios de rol vigentes y contradice las reglas de seguridad del proyecto. |

## Decisión

Elegimos **Google como proveedor de identidad mediante Auth.js, con sesión JWT y
autorización basada en el Usuario local**.

El perfil de Google debe contener `sub`, email válido y email verificado. El
email se normaliza a minúsculas y `googleSub` identifica de manera estable la
cuenta externa.

En el primer inicio de sesión, si no existe un Usuario local para el email, se
crea uno activo con el `googleSub` recibido y rol inicial `MECANICO`. Esta es una
decisión explícita del equipo para que el alta automática no otorgue privilegios
operativos superiores; no se atribuye a `docs/spec.md`.

Si existe un Usuario activo preparado por email sin `googleSub`, se vincula la
identidad y se conserva su rol. Se rechazan Usuarios inactivos y vínculos con
otra identidad.

`requerirUsuario()` obtiene la sesión y revalida en base de datos que el Usuario
exista y esté activo. `requerirRol()` compara el rol vigente con los roles
permitidos de la operación. Por lo tanto, el rol incluido en el JWT no es la
fuente definitiva para autorizar una operación.

## Consecuencias

- LuqGarage no almacena ni administra contraseñas propias.
- El primer acceso válido puede crear un Usuario local con el alcance inicial de
  `MECANICO`.
- Una baja o cambio de rol tiene efecto en la autorización posterior porque el
  Usuario y su rol se consultan nuevamente en base de datos.
- Cada operación protegida depende de la sesión de Auth.js y de la consulta al
  Usuario local vigente.
- Si se incorporan nuevos proveedores de identidad o cambia la estrategia de
  roles, debe revisarse el vínculo basado en `googleSub` y el flujo de alta.
