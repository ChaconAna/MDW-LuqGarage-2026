# LuqGarage — gestión para taller de chapa y pintura

## Equipo

- Ana Chacón — responsable del repositorio (creó el repo y tiene la cuenta de Vercel)
- Cintia Lucero
- Lucia Maximino

## Producción

https://mdw-luq-garage-2026.vercel.app/

## De qué se trata

LuqGarage es un MVP académico desarrollado para Metodologías y Desarrollos Web (MDW) 2026. Busca centralizar la gestión de un taller de chapa y pintura que trabaja con compañías aseguradoras.

El alcance actual corresponde al backend de las clases 1 a 7 y comprende tres procesos: registro de siniestros, gestión de presupuestos y generación de órdenes de trabajo.

Roles: recepcionista (gestiona la información administrativa y los siniestros), encargado del taller (gestiona presupuestos y órdenes de trabajo), mecánico (consulta órdenes finalizadas) y administrador (gestiona usuarios, roles y permisos).

Problema que resuelve: La gestión de siniestros, presupuestos y órdenes de trabajo se realiza de forma manual y descentralizada. Esto provoca demoras en los tiempos de respuesta, errores en los registros y fallas de comunicación con las aseguradoras, dificultando el seguimiento continuo de las reparaciones en el taller.

Flujo principal: `Siniestro → Presupuesto → aprobación/rechazo → Orden de Trabajo`.

El flujo del MVP termina al finalizar la generación de la Orden de Trabajo. La ejecución y el seguimiento de las reparaciones dentro del taller quedan fuera del alcance actual.

El backend todavía se encuentra en desarrollo. La especificación funcional completa está en [`docs/spec.md`](./docs/spec.md).

## Stack

Next.js (App Router) + TypeScript + PostgreSQL (Supabase) + Prisma + Zod + Auth.js + Tailwind CSS + shadcn/ui.

Supabase Storage para archivos. Deploy en Vercel.

## Cómo levantarlo

`npm install` · copiar `.env.example` a `.env.local` · `npm run dev`

## Autenticación con Google

Configurar `AUTH_SECRET`, `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` en
`.env.local` para desarrollo y como variables de entorno del deployment en
Vercel.

En el cliente OAuth de Google deben registrarse estos redirect URI de Auth.js:

- Desarrollo: `http://localhost:3000/api/auth/callback/google`
- Producción: `https://mdw-luq-garage-2026.vercel.app/api/auth/callback/google`

Un usuario Google nuevo se crea con rol `MECANICO`. Para probar la API como
`RECEPCIONISTA` o `ENCARGADO_DEL_TALLER`, el Usuario local puede prepararse o
modificarse manualmente mediante Prisma Studio en el entorno de prueba. Este es
un mecanismo de preparación del MVP, no una funcionalidad del producto. El rol
se almacena en la base de datos y se revalida del lado servidor al autorizar
cada request.
