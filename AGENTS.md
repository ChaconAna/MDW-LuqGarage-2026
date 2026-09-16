<!-- # AGENTS.md — reglas de este proyecto

Este archivo lo lee tu asistente de IA (Cursor, Copilot, Claude Code, etc.) antes de escribir código. Manténlo actualizado: si el equipo cambia una convención y esto no lo refleja, la IA va a seguir escribiendo con la convención vieja.

> **Cómo se escribe una regla acá:** verificable, no aspiracional. "Escribir código limpio" no es una regla. "Un componente por archivo, en PascalCase" sí lo es.

## Qué es este proyecto

<Completar en la clase 1: qué hace el sistema, quiénes son los dos roles y cuál es el flujo principal.>

## La especificación

Lo que el sistema tiene que hacer está en [`docs/spec.md`](./docs/spec.md): entidades, historias de usuario con sus criterios de aceptación, el flujo principal y las reglas de negocio.

- **Antes de escribir lógica de dominio, leelo.** Las reglas de la sección 6 no se deducen del código.
- **Si algo no está ahí, no lo inventes: preguntá.** Una regla de negocio adivinada es un error que compila y que nadie detecta hasta producción.
- Las reglas no se copian a este archivo: viven en un solo lugar y se leen desde ahí.

## Stack

- Next.js (App Router) + TypeScript
- Postgres + Prisma (o MongoDB Atlas + Prisma, si el equipo lo eligió y lo documentó en un ADR)
- Zod para validación
- Auth.js para sesión y roles
- Tailwind + shadcn/ui
- Deploy en Vercel

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm run typecheck    # chequeo de tipos
npm test         # tests
npx prisma migrate dev --name <nombre>
```

Después de tocar `prisma/schema.prisma`, siempre generar una migración. Nunca editar SQL de migraciones ya aplicadas.

## Estructura y dónde va cada cosa

| Si vas a escribir… | Va en… |
|---|---|
| Una página | `app/(public)/` si es sin sesión, `app/(app)/` si requiere sesión |
| Un endpoint | `app/api/<recurso>/route.ts` |
| Un componente reutilizable | `components/` |
| Una consulta a la base | `lib/db/<entidad>.ts` |
| Un schema de validación | `lib/schemas/<entidad>.ts` |
| Un helper sin dependencias | `lib/utils.ts` |

## Reglas

### Datos
- **Todo acceso a la base pasa por `lib/db/`.** Está prohibido importar el cliente de Prisma en componentes o en `app/`.
- El cliente de Prisma se importa solo desde `lib/db/client.ts`.
- Toda consulta que devuelva listas tiene paginación o límite explícito.

### Validación
- **Toda entrada externa se valida con un schema de Zod** definido en `lib/schemas/`. Entrada externa = body de un request, params, query string, formulario, respuesta de una API de terceros.
- El mismo schema se usa en el cliente y en el servidor. No duplicar reglas de validación.
- El tipo se **deriva** del schema con `z.infer`. No se escribe un `type` aparte que después se desincroniza.
- Todo campo con un conjunto conocido de valores —estados, roles, categorías— va como **unión literal** (`z.enum`), nunca `string`.
- Las fechas relativas a "ahora" se validan con `.refine()`, no con `.max(new Date())`: ese `new Date()` se evalúa al construir el schema y queda congelado al arrancar el servidor.
- Prohibido `any`. Si no se conoce el tipo, usar `unknown` y validar.

### Seguridad
- **La autorización se verifica siempre en el servidor**, en cada Route Handler y cada Server Action. Que la UI esconda un botón no es una medida de seguridad.
- Nunca confiar en un `userId` o un `role` que venga del cliente: se leen de la sesión.
- Los secretos van en variables de entorno. Ninguna variable con secretos lleva el prefijo `NEXT_PUBLIC_`.

### React / Next
- Los componentes son Server Components por defecto. `"use client"` solo si hay estado, efectos o eventos del navegador.
- Un componente por archivo, en PascalCase. Los archivos de utilidades, en camelCase.
- Los estados de carga y de error se resuelven siempre; no dejar la pantalla en blanco.

### Estilos
- Solo Tailwind. Nada de CSS suelto ni estilos inline salvo valores calculados en runtime.
- Los componentes de UI base salen de shadcn/ui y se editan en `components/ui/`.

### Git
- Ramas: `feat/<descripcion-corta>`, `fix/<descripcion-corta>`.
- Commits en imperativo y en español: "agrega validación de turnos superpuestos".
- Nunca commitear `.env.local` ni credenciales.

## Cómo quiero que trabajes

- Si la consigna es ambigua, **preguntá antes de escribir código**. No inventes reglas de negocio.
- Cambios chicos y enfocados. No refactorices archivos que no tienen que ver con la tarea.
- Antes de crear un helper nuevo, buscá si ya existe uno en `lib/`.
- Cuando toques algo de seguridad o del modelo de datos, explicá el porqué del cambio: son las dos áreas que se revisan línea por línea. -->

# AGENTS.md

## Qué es este proyecto

**LuqGarage**: sistema de gestión de siniestros, presupuestos y órdenes de
trabajo para un taller de chapería y pintura. Reemplaza el registro manual
(papel / WhatsApp) por un flujo digital con trazabilidad completa.

Dos roles, y el segundo es un superset del primero:

- Encargado del taller: registra siniestros, carga presupuestos (reparaciones y repuestos), genera y actualiza órdenes de trabajo, y gestiona clientes, vehículos y aseguradoras. Sin acceso al módulo de seguridad.
- Gerente (dueño del taller): todo lo del encargado, más el módulo de seguridad: gestión de usuarios (altas, bajas, asignación de rol).

La diferencia entre los dos roles no está en el flujo del taller —ahí hacen lo mismo— sino en la administración del sistema: solo el Gerente puede crear o dar de baja usuarios y asignarles un rol.

Flujo principal: se registra un siniestro (cliente + vehículo + datos del hecho) → se carga un presupuesto con reparaciones y repuestos → al confirmarlo se envía a la aseguradora → una vez aprobado, se genera la orden de trabajo, dividida en sectores (Desarme, Reparación, Preparación, Pintura, Armado, Terminado) → la orden queda finalizada cuando todos los sectores completaron sus tareas.

Integración externa del proyecto: la respuesta de la aseguradora se simula con un endpoint propio (/api/aseguradora/consultar o similar) que imita a un servicio externo: recibe un presupuesto y devuelve APROBADO o RECHAZADO de forma aleatoria

Fuera de alcance de esta versión: gestión de stock/insumos, facturación y
registro de pagos. Quedan anotados en `docs/spec.md` para una iteración
futura, no se implementan ahora.

## Stack

Next.js (App Router) + TypeScript + Postgres (Supabase) + Prisma + Zod +
Auth.js + Tailwind. Deploy en Vercel.

## Comandos

```
npm run dev              # levantar en local
npm run build            # build de producción
npm run typecheck        # chequeo de tipos
npm run lint             # linter (any prohibido, entre otras reglas)
npm test                 # tests

npx prisma migrate dev --name <nombre>   # crear y aplicar una migración (solo en desarrollo)
npx prisma studio                        # ver/editar datos
npx prisma migrate status                # confirmar que la base tiene lo que dice el repo
npm run db:seed                          # cargar datos de ejemplo
```

## Dónde va cada cosa

- Páginas → `app/`
- Endpoints → `app/api/<recurso>/route.ts`
- Componentes → `components/`
- Acceso a datos (Prisma) → `lib/db/`
- Schemas de Zod → `lib/schemas/`
- Modelo de datos → `prisma/schema.prisma`
- Qué es el proyecto y quiénes son → `README.md`
- Qué tiene que hacer el sistema (historias, reglas de negocio) → `docs/spec.md`
- Por qué se eligió cada tecnología → `docs/adr/`
- Convenciones para vos (IA) → este archivo

## Entidades del dominio

El detalle completo (atributos, obligatorio/opcional, reglas) vive en
`docs/spec.md` y en `prisma/schema.prisma`. Resumen para orientarte:

| Entidad | Qué es | Relación |


## Reglas de negocio que no podés adivinar

- La fecha del siniestro no puede ser posterior a hoy.
- El número de siniestro no puede repetirse.
- Una orden de trabajo solo se puede crear si existe al menos un presupuesto en estado APROBADO para ese siniestro.
- Un presupuesto en estado BORRADOR no se envía a la aseguradora; al confirmarlo pasa a ENVIADO y se dispara la consulta a la API simulada de la aseguradora. El paso a APROBADO o RECHAZADO lo decide esa respuesta, no un rol interno — ni el Encargado ni el Gerente "aprueban" el presupuesto a mano.
- La consulta a la aseguradora puede tardar y puede fallar: el presupuesto tiene que poder quedar en ENVIADO esperando respuesta, y la pantalla no puede quedar colgada ni mostrar un estado falso mientras tanto.
- La orden de trabajo se considera finalizada cuando todos sus sectores completaron sus tareas — no antes.

## Reglas de código (verificables)

- **Prohibido `any`.** Si algo no tiene tipo, es `unknown` y se valida con Zod.
- Toda entrada externa (body de request, query params, formularios) se
  valida con un schema de Zod en `lib/schemas/` antes de usarse.
- `type` por defecto para los tipos del dominio. `interface` solo si hay
  una jerarquía real con `extends`.
- Los permisos por rol se verifican siempre en el servidor, nunca solo ocultando un botón en el cliente. En particular: los endpoints de gestión de usuarios (/api/usuarios/...) rechazan cualquier request de un Encargado, no solo lo ocultan en la interfaz.
- Prohibido importar Prisma fuera de `lib/db/`.
- Un enum de Prisma (y su unión literal equivalente en Zod) para cada
  lista cerrada de valores: estados de presupuesto/orden, sectores, tipo
  de vehículo. Nunca `string` suelto para esto.
- Toda foreign key por la que se filtre lleva `@@index`.
- `onDelete` se decide explícitamente en cada relación de Prisma. Por
  default, lo que es historial (`Siniestro`, `Presupuesto`, `OrdenTrabajo`)
  usa `Restrict`, no `Cascade` — no se borra el historial de un cliente o
  vehículo dado de baja.
- Dinero (costos, totales) se guarda como `Decimal`, nunca `Float`.
- Un componente de React por archivo, en PascalCase.
- Nombres de entidades y campos del dominio en castellano, coherentes con
  `docs/spec.md` (`Siniestro`, `fechaSiniestro`, no `Accident`, `date`).
- Commits en español, en modo imperativo (ej: "agrega validación de
  número de siniestro duplicado").

## Cómo quiero que trabajes

- Si falta una regla de negocio o la consigna es ambigua, preguntá antes
  de escribir código — no asumas un default.
- Cambios chicos y acotados al pedido. No refactorices archivos que no
  tienen que ver.
- Antes de crear un helper nuevo, fijate si ya existe algo parecido en
  `lib/`.
- Si te pido traducir un modelo o schema ya decidido a Prisma o Zod,
  hacé solo la traducción — no agregues campos, entidades ni relaciones
  que no te pedí.
- Si armás vos un schema desde cero a partir de la spec, decime
  explícitamente qué decidiste en: obligatorio/opcional, cardinalidad,
  qué es enum y qué es texto libre — para revisarlo antes de mergear.
- Nunca pongas `onDelete: Cascade` sin que yo lo confirme explícitamente.
- Si un error de tipos no se entiende, explicámelo primero. No lo
  "arregles" poniendo `any`.
- La API de la aseguradora es simulada: no busques ni propongas integrarte con un servicio real. Si programás la lógica de aprobado/rechazado, dejá un comentario que diga explícitamente que es simulada, para que quede claro en el código y en la defensa.
