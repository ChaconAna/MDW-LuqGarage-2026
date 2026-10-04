# Contrato HTTP actual — LuqGarage

Este documento describe exclusivamente la API implementada actualmente para
Cliente, Aseguradora y Vehículo. No documenta endpoints futuros de Siniestro,
Presupuesto, Orden de Trabajo ni catálogos.

## Estado de la autorización

Según `docs/spec.md`, la **Recepcionista** puede gestionar Clientes, Vehículos
y Aseguradoras, y el **Encargado del Taller** puede realizar todas las tareas
administrativas de la Recepcionista.

Esos son los roles requeridos por el contrato futuro. La autenticación y la
autorización pertenecen a Clase 6 y todavía no están implementadas. Por lo
tanto, los endpoints descritos aquí actualmente no verifican sesión o rol y no
devuelven `401 Unauthorized` ni `403 Forbidden`.

## Convenciones actuales

- Todos los identificadores son UUID.
- El parámetro de ruta `[id]` es obligatorio, identifica el recurso y debe ser
  un UUID válido.
- Las respuestas de error tienen la forma `{ "error": "mensaje" }`.
- Un JSON malformado, un parámetro inválido o un body que no cumple su schema
  produce `400 Bad Request`.
- Los schemas de creación y actualización son estrictos: rechazan campos
  adicionales.
- No se aplican formatos o normalizaciones no expresados por los schemas
  actuales. En particular, DNI, CUIT, patente, teléfono y email se validan
  solamente como strings.
- Los listados incluyen registros activos e inactivos y se ordenan por `id`.
- `GET` individual, `POST` y `PATCH` exitosos devuelven la representación
  completa del recurso correspondiente. En los listados, `data` contiene un
  array de esas representaciones.
- Los DELETE realizan baja lógica (`activo = false`), son idempotentes para un
  registro existente y nunca eliminan físicamente información.

### Paginación

Los tres endpoints de listado aceptan:

| Query param | Tipo | Default | Restricción |
|---|---:|---:|---|
| `page` | entero | `1` | mayor que cero |
| `limit` | entero | `10` | entre `1` y `100` |

Una consulta válida devuelve `200 OK` con esta estructura:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

Una query de paginación inválida devuelve `400 Bad Request`.

## Cliente

Rol futuro: **Recepcionista o Encargado del Taller**. Actualmente no se
controla sesión ni rol.

### Representación

```json
{
  "id": "uuid",
  "nombre": "Ana",
  "apellido": "Pérez",
  "dni": "30111222",
  "telefono": "1122334455",
  "email": "ana@example.com",
  "direccion": "Calle 123",
  "activo": true,
  "localidad": {
    "id": "uuid",
    "nombre": "Localidad",
    "provincia": {
      "id": "uuid",
      "nombre": "Provincia"
    }
  }
}
```

### Operaciones

| Método y ruta | Propósito | Éxito actual | Errores actuales |
|---|---|---|---|
| `GET /api/clientes` | Lista clientes con paginación | `200` | `400` query inválida |
| `POST /api/clientes` | Crea un cliente activo | `201` | `400` body inválido, `404` Localidad inexistente, `409` DNI duplicado |
| `GET /api/clientes/[id]` | Obtiene un cliente activo o inactivo | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/clientes/[id]` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` Cliente o Localidad inexistente, `409` DNI duplicado |
| `DELETE /api/clientes/[id]` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

### POST `/api/clientes`

Body exacto:

```json
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "dni": "30111222",
  "telefono": "1122334455",
  "email": "ana@example.com",
  "direccion": "Calle 123",
  "localidadId": "uuid"
}
```

Todos los campos son obligatorios. `localidadId` debe ser UUID. `id` y
`activo` son rechazados; el servidor genera el ID y establece `activo=true`.
La respuesta `201` contiene la representación completa del Cliente.

### PATCH `/api/clientes/[id]`

Acepta cualquier subconjunto no vacío de los campos del POST. Por ejemplo:

```json
{
  "telefono": "1199999999",
  "direccion": "Nueva dirección 456"
}
```

`{}` y los campos adicionales son inválidos. Se permite modificar un Cliente
inactivo, pero PATCH no puede modificar `activo` ni reactivarlo.

### DELETE `/api/clientes/[id]`

No recibe body. Si el Cliente existe, esté activo o inactivo, establece
`activo=false` y devuelve `204 No Content`.

## Aseguradora

Rol futuro: **Recepcionista o Encargado del Taller**. Actualmente no se
controla sesión ni rol.

### Representación

```json
{
  "id": "uuid",
  "nombre": "Aseguradora Ejemplo",
  "cuit": "30-12345678-9",
  "telefono": "1122334455",
  "email": "contacto@example.com",
  "direccion": "Avenida 123",
  "activo": true
}
```

### Operaciones

| Método y ruta | Propósito | Éxito actual | Errores actuales |
|---|---|---|---|
| `GET /api/aseguradoras` | Lista aseguradoras con paginación | `200` | `400` query inválida |
| `POST /api/aseguradoras` | Crea una aseguradora activa | `201` | `400` body inválido, `409` CUIT duplicado |
| `GET /api/aseguradoras/[id]` | Obtiene una aseguradora activa o inactiva | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/aseguradoras/[id]` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` inexistente, `409` CUIT duplicado |
| `DELETE /api/aseguradoras/[id]` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

### POST `/api/aseguradoras`

Body exacto:

```json
{
  "nombre": "Aseguradora Ejemplo",
  "cuit": "30-12345678-9",
  "telefono": "1122334455",
  "email": "contacto@example.com",
  "direccion": "Avenida 123"
}
```

Todos los campos son obligatorios. `id` y `activo` son rechazados; el servidor
genera el ID y establece `activo=true`. La respuesta `201` contiene la
representación completa de la Aseguradora.

### PATCH `/api/aseguradoras/[id]`

Acepta cualquier subconjunto no vacío de los campos del POST. Por ejemplo:

```json
{
  "telefono": "1188888888"
}
```

`{}` y los campos adicionales son inválidos. Se permite modificar una
Aseguradora inactiva, pero PATCH no puede modificar `activo` ni reactivarla.

### DELETE `/api/aseguradoras/[id]`

No recibe body. Si la Aseguradora existe, esté activa o inactiva, establece
`activo=false` y devuelve `204 No Content`.

## Vehículo

Rol futuro: **Recepcionista o Encargado del Taller**. Actualmente no se
controla sesión ni rol.

### Representación

```json
{
  "id": "uuid",
  "patente": "ABC123",
  "activo": true,
  "modelo": {
    "id": "uuid",
    "nombre": "Modelo",
    "marca": {
      "id": "uuid",
      "nombre": "Marca"
    }
  },
  "tipoVehiculo": {
    "id": "uuid",
    "nombre": "Automóvil"
  }
}
```

Marca se obtiene mediante Modelo. La API no expone una relación directa entre
Cliente y Vehículo.

### Operaciones

| Método y ruta | Propósito | Éxito actual | Errores actuales |
|---|---|---|---|
| `GET /api/vehiculos` | Lista vehículos con paginación | `200` | `400` query inválida |
| `POST /api/vehiculos` | Crea un vehículo activo | `201` | `400` body/UUID inválido, `404` Modelo o TipoVehiculo inexistente, `409` patente duplicada |
| `GET /api/vehiculos/[id]` | Obtiene un vehículo activo o inactivo | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/vehiculos/[id]` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` Vehículo, Modelo o TipoVehiculo inexistente, `409` patente duplicada |
| `DELETE /api/vehiculos/[id]` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

### POST `/api/vehiculos`

Body exacto:

```json
{
  "patente": "ABC123",
  "modeloId": "uuid",
  "tipoVehiculoId": "uuid"
}
```

Todos los campos son obligatorios y las dos claves foráneas deben ser UUID.
`id`, `activo`, `clienteId` y `marcaId` son rechazados. El servidor genera el
ID y establece `activo=true`. No se crean ni modifican catálogos desde este
endpoint. La respuesta `201` contiene la representación completa del Vehículo.

### PATCH `/api/vehiculos/[id]`

Acepta cualquier subconjunto no vacío de `patente`, `modeloId` y
`tipoVehiculoId`. Por ejemplo:

```json
{
  "patente": "XYZ789"
}
```

`{}` y los campos adicionales son inválidos. Se permite modificar un Vehículo
inactivo, pero PATCH no puede modificar `activo` ni reactivarlo.

### DELETE `/api/vehiculos/[id]`

No recibe body. Si el Vehículo existe, esté activo o inactivo, establece
`activo=false` y devuelve `204 No Content`.
