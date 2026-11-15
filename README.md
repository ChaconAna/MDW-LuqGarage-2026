# LuqGarage — gestión para taller de chapa y pintura

## Equipo

- Ana Chacón — responsable del repositorio (creó el repo y tiene la cuenta de Vercel)
- Cintia Lucero
- Lucia Maximino

## Producción

https://mdw-luq-garage-2026.vercel.app/

## De qué se trata

LuqGarage es un MVP académico desarrollado para Metodologías y Desarrollos Web (MDW) 2026. Busca centralizar la gestión de un taller de chapa y pintura que trabaja con compañías aseguradoras.

El backend desarrollado durante las clases 1 a 7 se mantiene funcional y comprende tres procesos: registro de siniestros, gestión de presupuestos y generación de órdenes de trabajo. La Clase 10 incorporó la interfaz con React y Next.js y un sistema de diseño. Durante la Clase 12 se agregaron formularios y Server Actions para recorrer el flujo principal desde la interfaz, reutilizando las reglas del backend.

Roles: recepcionista (gestiona la información administrativa y los siniestros), encargado del taller (gestiona presupuestos y órdenes de trabajo), mecánico (consulta órdenes finalizadas) y administrador (gestiona usuarios, roles y permisos).

Problema que resuelve: La gestión de siniestros, presupuestos y órdenes de trabajo se realiza de forma manual y descentralizada. Esto provoca demoras en los tiempos de respuesta, errores en los registros y fallas de comunicación con las aseguradoras, dificultando el seguimiento continuo de las reparaciones en el taller.

Flujo principal: `Siniestro → Presupuesto → aprobación/rechazo → Orden de Trabajo`.

El flujo del MVP termina al finalizar la generación de la Orden de Trabajo. La ejecución y el seguimiento de las reparaciones dentro del taller quedan fuera del alcance actual.

La especificación funcional completa y el mapa de pantallas del flujo principal están en [`docs/spec.md`](./docs/spec.md).

## Interfaz disponible

| Dirección | Propósito | Acceso |
|---|---|---|
| `/` | Punto de entrada y redirección según la sesión y el rol vigente | Público |
| `/login` | Inicio de sesión con Google | Público; los usuarios autenticados son redirigidos a una pantalla autorizada |
| `/siniestros` | Listado paginado y filtro de los siniestros de la página | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` |
| `/siniestros/nuevo` | Registro de siniestro con documentación obligatoria | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` |
| `/siniestros/[id]` | Detalle de un siniestro | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` |
| `/siniestros/[id]/presupuestos/nuevo` | Creación de presupuesto en `BORRADOR` | `ENCARGADO_DEL_TALLER` |
| `/presupuestos/[id]` | Consulta del presupuesto y registro manual de envío, aprobación o rechazo según su estado | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` |
| `/presupuestos/[id]/editar` | Edición de presupuesto en `BORRADOR` | `ENCARGADO_DEL_TALLER` |
| `/siniestros/[id]/ordenes-trabajo/nueva` | Selección de presupuestos aprobados y creación de Orden de Trabajo en `BORRADOR` | `ENCARGADO_DEL_TALLER` |
| `/ordenes-trabajo` | Listado de todas las órdenes para el Encargado y sólo de las `FINALIZADA` para el Mecánico | `ENCARGADO_DEL_TALLER`, `MECANICO` |
| `/ordenes-trabajo/[id]` | Consulta de la orden; incorporación de presupuestos, edición de observaciones por sector y finalización si está en `BORRADOR` | `ENCARGADO_DEL_TALLER` consulta y confecciona; `MECANICO` consulta sólo `FINALIZADA` |
| `/sistema` | Galería del sistema de diseño | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER`, `MECANICO`, `ADMINISTRADOR` |

Las pantallas privadas validan la sesión, el estado activo del Usuario y su rol vigente en el servidor. La interfaz utiliza Tailwind CSS 4 y componentes base de shadcn/ui, con un tema oscuro permanente y estilos reutilizables.

### Fuera del alcance

El envío de comunicaciones a aseguradoras y la recepción automática de sus respuestas no forman parte de estas pantallas: el envío y la respuesta se registran manualmente después de ocurrir fuera de LuqGarage. La ejecución y el seguimiento físico de reparaciones también quedan fuera del alcance del MVP.

### Pruebas integrales pendientes

Las pruebas automatizadas del flujo de escritura usan dependencias simuladas. Sigue pendiente una prueba integral de persistencia y archivos con PostgreSQL y Supabase Storage en un entorno aislado, además de la comprobación manual de la interfaz a 375 px y en el despliegue. No se ha confirmado que la configuración local esté aislada de los recursos de producción.

## Stack

Next.js (App Router) + TypeScript + PostgreSQL (Supabase) + Prisma + Zod + Auth.js + Tailwind CSS + shadcn/ui.

Supabase Storage para archivos. Deploy en Vercel.

## Instalación y ejecución local

Se recomienda utilizar la última versión de Node.js 22 (como mínimo 22.20.0),
la misma rama utilizada por la CI del proyecto.

1. Instalar las dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` como `.env.local` y completar todas las variables de
   base de datos, Supabase Storage y autenticación antes de continuar. No deben
   incluirse secretos reales en archivos versionados.

3. Aplicar las migraciones existentes de Prisma a la base configurada:

   ```bash
   npx prisma migrate dev
   ```

4. Cargar los datos iniciales:

   ```bash
   npm run db:seed
   ```

5. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

La aplicación queda disponible de forma predeterminada en
`http://localhost:3000`.

### Comandos disponibles

```bash
npm run dev        # servidor de desarrollo
npm test           # tests
npm run typecheck  # chequeo de tipos
npm run lint       # lint
npm run build      # build de producción
```

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
