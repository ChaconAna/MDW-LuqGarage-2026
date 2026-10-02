# AGENTS.md — reglas de este proyecto

Este archivo lo lee el asistente de IA antes de escribir código. Mantenerlo actualizado: si el equipo cambia una convención y este archivo no lo refleja, el asistente continuará trabajando con la convención anterior.

> **Cómo se escribe una regla acá:** verificable, no aspiracional. "Escribir código limpio" no es una regla. "Un componente por archivo, en PascalCase" sí lo es.

## Qué es este proyecto

**LuqGarage** es un sistema web de gestión para un taller de chapa y pintura orientado al trabajo con compañías aseguradoras.

El MVP centraliza tres procesos principales:

1. Registro de siniestros.
2. Gestión de presupuestos.
3. Generación de órdenes de trabajo.

Los actores definidos para el MVP son:

- **Recepcionista:** gestiona información administrativa, clientes, vehículos, aseguradoras y siniestros. Puede intervenir manualmente en el estado de un presupuesto cuando falle el procesamiento automático de la respuesta de la aseguradora, según las reglas definidas en `docs/spec.md`.
- **Encargado del Taller:** puede realizar las tareas administrativas correspondientes y además gestionar presupuestos y órdenes de trabajo.
- **Mecánico:** consulta las órdenes de trabajo habilitadas según el alcance definido en `docs/spec.md`.
- **Administrador:** gestiona usuarios, roles y permisos.

El flujo principal es:

`Siniestro → Presupuesto → aprobación/rechazo → Orden de Trabajo`

Un siniestro puede tener múltiples presupuestos. Una Orden de Trabajo puede agrupar uno o varios presupuestos aprobados del mismo siniestro, y cada presupuesto puede pertenecer como máximo a una Orden de Trabajo.

El alcance actual corresponde al backend trabajado en las clases 1 a 7. No implementar frontend ni funcionalidades correspondientes a etapas posteriores salvo solicitud explícita.

## La especificación

Lo que el sistema tiene que hacer está en [`docs/spec.md`](./docs/spec.md): entidades, actores, criterios de aceptación, flujo principal, estados, integraciones externas y reglas de negocio.

- **Antes de escribir lógica de dominio, leer `docs/spec.md`.**
- **`docs/spec.md` es la fuente de verdad funcional del proyecto.**
- Si algo no está definido ahí, no inventarlo: preguntar antes de implementar.
- Si una tarea contradice el `spec`, señalar la contradicción antes de modificar código.
- No modificar `docs/spec.md` salvo solicitud explícita.
- Las reglas de negocio no se duplican en este archivo: viven en `docs/spec.md`.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Supabase) + Prisma
- Zod para validación
- Auth.js para sesión y roles
- Tailwind + shadcn/ui
- Deploy en Vercel
- Supabase Storage para documentación y fotografías de siniestros
- Mailtrap para la simulación de comunicación por email con aseguradoras
- Servicio externo de IA para la extracción asistida de datos de documentación, según `docs/spec.md`

No reemplazar estas tecnologías ni agregar dependencias alternativas sin una necesidad concreta y aprobación previa.

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm run lint         # lint
npm run typecheck    # chequeo de tipos
npm test             # tests
npx prisma migrate dev --name <nombre>
npx prisma studio
npm run db:seed
```

Después de modificar `prisma/schema.prisma`, generar la migración correspondiente cuando la tarea requiera aplicar ese cambio a la base.

Nunca editar una migración ya aplicada para modificar el historial de la base de datos.

## Estructura y dónde va cada cosa

| Si vas a escribir… | Va en… |
|---|---|
| Una página pública | `app/(public)/` |
| Una página que requiere sesión | `app/(app)/` |
| Un endpoint | `app/api/<recurso>/route.ts` |
| Un componente reutilizable | `components/` |
| Una consulta o persistencia de base de datos | `lib/db/<entidad>.ts` |
| Un schema de validación | `lib/schemas/<entidad>.ts` |
| Lógica de negocio reutilizable | `lib/services/` |
| Integración con un servicio externo | `lib/services/` |
| Un helper general sin dependencias de dominio | `lib/utils.ts` |

Los Route Handlers coordinan la petición HTTP, autenticación/autorización, validación y llamada a la lógica correspondiente. No concentrar reglas complejas de negocio ni acceso directo a Prisma dentro del Route Handler.

## Reglas

### Datos

- **Todo acceso a la base pasa por `lib/db/`.**
- Está prohibido importar el cliente de Prisma en componentes o directamente en `app/`.
- El cliente de Prisma se importa solo desde `lib/db/client.ts`.
- Toda consulta que devuelva listas tiene paginación o límite explícito.
- Respetar las bajas lógicas definidas en `docs/spec.md`.
- No implementar borrado físico para entidades cuyo historial deba conservarse.
- No persistir datos calculables salvo que exista una razón explícita documentada.
- No modificar relaciones del dominio para simplificar una implementación.

### Validación

- **Toda entrada externa se valida con un schema de Zod** definido en `lib/schemas/`.
- Entrada externa incluye body de requests, params, query strings, formularios y respuestas de APIs o servicios de terceros.
- El mismo schema se reutiliza cuando corresponda en cliente y servidor. No duplicar reglas de validación.
- Los tipos se derivan con `z.infer`. No crear tipos manuales equivalentes que puedan desincronizarse.
- Todo campo con un conjunto conocido de valores —estados, roles, categorías— usa `z.enum` o el mecanismo tipado correspondiente, nunca un `string` genérico.
- Las fechas relativas a "ahora" se validan dinámicamente mediante `.refine()`, no mediante valores de fecha congelados al inicializar el módulo.
- Prohibido `any`. Si un valor externo todavía no tiene un tipo confiable, usar `unknown` y validarlo.

### Reglas de negocio

- Las reglas de negocio se obtienen de `docs/spec.md`.
- No permitir transiciones de estado que no estén definidas en el `spec`.
- Validar las reglas de negocio en el servidor aunque posteriormente exista una UI que impida realizar una acción.
- Un endpoint no puede saltarse una regla por recibir datos aparentemente válidos.
- Si una operación involucra varias reglas, mantener la lógica separada del Route Handler cuando corresponda.
- Ante una regla ambigua o ausente, detener la implementación y preguntar.

### Seguridad

- **La autorización se verifica siempre en el servidor**, en cada Route Handler y Server Action.
- Que una futura UI esconda una acción no constituye autorización.
- Nunca confiar en `userId`, `role` o permisos enviados por el cliente: se obtienen de la sesión.
- Los secretos se almacenan en variables de entorno.
- Ninguna variable que contenga secretos lleva el prefijo `NEXT_PUBLIC_`.
- Nunca registrar tokens, contraseñas, API keys o secretos en logs.
- Nunca commitear `.env.local` ni credenciales.

### Servicios externos

- Toda integración externa se encapsula en `lib/services/`.
- Los Route Handlers no deben conocer detalles internos innecesarios del proveedor.
- Toda llamada a un servicio externo debe tener un timeout explícito.
- Manejar las fallas según la clasificación esencial/accesoria definida por el negocio.
- Una falla externa no debe dejar datos en un estado inconsistente.
- Las respuestas externas son entrada no confiable y deben validarse antes de utilizarse.
- Registrar fallas técnicas sin exponer secretos.
- No cambiar automáticamente estados de dominio cuando la respuesta externa sea ambigua.
- No agregar reintentos automáticos, colas, cron jobs u otra infraestructura no solicitada.

### React / Next

- Los componentes son Server Components por defecto.
- `"use client"` solo cuando sea necesario por estado, efectos o eventos del navegador.
- Un componente por archivo, en PascalCase.
- Archivos de utilidades en camelCase.
- Los estados de carga y error deben resolverse cuando se implemente la interfaz correspondiente.

### Estilos

- Solo Tailwind.
- No agregar CSS suelto ni estilos inline salvo valores calculados en runtime.
- Los componentes base de UI provienen de shadcn/ui y se ubican/editan en `components/ui/`.

## Git

- Ramas: `feat/<descripcion-corta>` y `fix/<descripcion-corta>`.
- Commits en imperativo y en español.
- Nunca commitear `.env.local` ni credenciales.
- **El asistente de IA no realiza commits.**
- **El asistente de IA no realiza push.**
- El usuario revisa los cambios y realiza los commits manualmente.
- No modificar el historial de Git.
- No incluir en una tarea cambios no relacionados para “aprovechar” el commit.

## Cómo quiero que trabajes

El desarrollo se realiza de manera incremental para que cada avance pueda revisarse y registrarse mediante un commit pequeño y coherente.

### Antes de modificar código

1. Leer `docs/spec.md` cuando la tarea involucre dominio.
2. Revisar el código existente relacionado.
3. No asumir que algo falta sin comprobarlo.
4. Indicar brevemente qué archivos será necesario crear o modificar y por qué.
5. Si existe una ambigüedad funcional, preguntar antes de implementar.

### Durante la implementación

- Resolver únicamente el objetivo solicitado.
- No comenzar funcionalidades adicionales.
- No adelantarse a clases o etapas posteriores.
- No hacer refactors no relacionados con la tarea.
- No cambiar arquitectura, stack o dependencias sin aprobación.
- Antes de crear un helper, schema, servicio o función nueva, comprobar si ya existe una implementación reutilizable.
- Mantener los cambios suficientemente pequeños para que formen un único commit coherente.

### Después de implementar

Informar:

1. Archivos creados.
2. Archivos modificados.
3. Qué comportamiento se agregó o cambió.
4. Qué reglas de `docs/spec.md` están involucradas.
5. Qué verificaciones se ejecutaron.
6. Resultado de dichas verificaciones.
7. Cualquier pendiente o decisión que haya quedado abierta.

Ejecutar las verificaciones apropiadas al cambio realizado.

Como mínimo, cuando corresponda:

```bash
npm run typecheck
npm run lint
npm test
```

Ejecutar `npm run build` cuando el cambio pueda afectar el build de producción o antes de considerar terminada una etapa relevante.

No solucionar errores desactivando TypeScript, ESLint, tests, validaciones o controles de seguridad.

Cuando se modifique seguridad o modelo de datos, explicar el motivo del cambio: ambas áreas se revisan especialmente.