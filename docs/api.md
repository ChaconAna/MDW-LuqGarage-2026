# Contrato HTTP actual — LuqGarage

Este documento describe exclusivamente la API implementada actualmente para
Cliente, Aseguradora, Vehículo, Siniestro y la consulta de Presupuesto. No
documenta operaciones futuras de alta, modificación o transición de
Presupuesto, ni endpoints de Orden de Trabajo o catálogos.

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
  definida para el recurso correspondiente. En los listados, `data` contiene
  un array de las representaciones definidas para cada listado.
- Los DELETE realizan baja lógica (`activo = false`), son idempotentes para un
  registro existente y nunca eliminan físicamente información.

### Paginación

Los cinco endpoints de listado aceptan:

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

## Siniestro

Rol futuro: **Recepcionista o Encargado del Taller**. Actualmente no se
controla sesión ni rol porque la autenticación y la autorización se
implementarán en Clase 6.

El listado incluye Siniestros de cualquier estado y devuelve una
representación resumida sin documentos. El detalle devuelve la misma
información más los documentos asociados. Ninguna de las dos operaciones
incluye Presupuestos ni Órdenes de Trabajo.

### Representación del listado

```json
{
  "id": "uuid",
  "numeroSiniestro": "SIN-SEED-VALIDO-001",
  "fechaSiniestro": "2026-03-01T12:00:00.000Z",
  "fechaRegistro": "2026-03-02T12:00:00.000Z",
  "gradoDano": "MODERADO",
  "numeroPoliza": "POL-SEED-001",
  "estado": "PENDIENTE_DE_FACTURACION",
  "cliente": {
    "id": "uuid",
    "nombre": "Cliente",
    "apellido": "Ficticio",
    "dni": "00000000",
    "activo": true
  },
  "vehiculo": {
    "id": "uuid",
    "patente": "SEED000",
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
  },
  "aseguradora": {
    "id": "uuid",
    "nombre": "Aseguradora Ficticia",
    "cuit": "00-00000000-0",
    "activo": true
  }
}
```

### Representación del detalle

El detalle contiene todos los campos de la representación del listado y
agrega exclusivamente:

```json
{
  "documentos": [
    {
      "id": "uuid",
      "tipo": "DENUNCIA",
      "referenciaArchivo": "seed/flujo-valido/denuncia.jpg"
    }
  ]
}
```

`referenciaArchivo` se devuelve exactamente como está persistido. En esta
etapa es una referencia textual: la API no asume que sea una URL pública, una
URL firmada, un path definitivo de Supabase o una key de Storage, y no
consulta la existencia física del archivo.

### Operaciones

| Método y ruta | Propósito | Éxito actual | Errores actuales |
|---|---|---|---|
| `GET /api/siniestros` | Lista Siniestros con paginación, sin documentos | `200` | `400` query inválida |
| `POST /api/siniestros` | Registra un Siniestro con toda su documentación | `201` | `400` body/RN02/RN06 inválidos, `404` relación inexistente, `409` número duplicado o relación inactiva |
| `GET /api/siniestros/[id]` | Obtiene un Siniestro con sus documentos | `200` | `400` UUID inválido, `404` inexistente |

### POST `/api/siniestros`

Body exacto:

```json
{
  "numeroSiniestro": "SIN-2026-0001",
  "fechaSiniestro": "2026-03-03T14:30:00.000Z",
  "gradoDano": "MODERADO",
  "numeroPoliza": "POL-123456",
  "clienteId": "uuid",
  "vehiculoId": "uuid",
  "aseguradoraId": "uuid",
  "documentos": [
    {
      "tipo": "DENUNCIA",
      "referenciaArchivo": "documentos/denuncia.jpg"
    },
    {
      "tipo": "LATERAL_DERECHA",
      "referenciaArchivo": "documentos/lateral-derecha.jpg"
    },
    {
      "tipo": "LATERAL_IZQUIERDA",
      "referenciaArchivo": "documentos/lateral-izquierda.jpg"
    },
    {
      "tipo": "FRONTAL",
      "referenciaArchivo": "documentos/frontal.jpg"
    },
    {
      "tipo": "TRASERA",
      "referenciaArchivo": "documentos/trasera.jpg"
    },
    {
      "tipo": "CERTIFICADO_COBERTURA",
      "referenciaArchivo": "documentos/certificado.jpg"
    }
  ]
}
```

`numeroSiniestro`, `numeroPoliza` y cada `referenciaArchivo` deben ser strings
no vacíos. `fechaSiniestro` debe ser un timestamp ISO válido y no puede ser
posterior a la fecha de registro capturada por el servidor. `gradoDano` acepta
`LEVE`, `MODERADO` o `GRAVE`. Los tres identificadores relacionados deben ser
UUID.

El array `documentos` debe contener exactamente un elemento de cada tipo
obligatorio: `DENUNCIA`, `LATERAL_DERECHA`, `LATERAL_IZQUIERDA`, `FRONTAL`,
`TRASERA` y `CERTIFICADO_COBERTURA`. Puede contener cero o más elementos
`ADICIONAL`; no se exige que `referenciaArchivo` sea único.

El body es estricto. No acepta `id`, `fechaRegistro`, `estado`,
`documentos[].id`, `documentos[].siniestroId` ni otros campos adicionales.
El servidor genera esos valores, establece el estado `REGISTRADO` y crea el
Siniestro y todos sus documentos atómicamente. La respuesta `201` utiliza la
representación del detalle definida arriba.

Una relación inexistente devuelve `404`. Una relación existente pero inactiva
o un `numeroSiniestro` duplicado devuelve `409`. Una fecha posterior a la de
registro o una composición documental que incumple RN06 devuelve `400`.

En este incremento, `referenciaArchivo` es exclusivamente la referencia
textual persistida. El POST no carga ni comprueba físicamente archivos en
Supabase Storage; esa integración queda pendiente para el incremento de
servicios externos.

No están implementados `PATCH` ni `DELETE` de Siniestro.

## Presupuesto

Rol futuro: **Encargado del Taller**. Actualmente no se controla sesión ni rol
porque la autenticación y la autorización se implementarán en Clase 6.

El listado incluye Presupuestos de todos los estados: `BORRADOR`, `ENVIADO`,
`APROBADO` y `RECHAZADO`.

### Representación del listado

```json
{
  "id": "uuid",
  "numeroPresupuesto": "PRES-SEED-001",
  "estado": "APROBADO",
  "siniestro": {
    "id": "uuid",
    "numeroSiniestro": "SIN-SEED-VALIDO-001"
  }
}
```

La representación no incluye reparaciones, repuestos, total, Orden de Trabajo
ni datos adicionales del Siniestro. El modelo actual tampoco contiene una
fecha de creación del Presupuesto.

### Representación del detalle

El detalle contiene los campos de la representación del listado y agrega:

```json
{
  "reparaciones": [
    {
      "id": "uuid",
      "costo": "150000.00",
      "reparacion": {
        "id": "uuid",
        "nombre": "Reparación Demo de Chapa"
      }
    }
  ],
  "repuestos": [
    {
      "id": "uuid",
      "cantidad": 2,
      "repuesto": {
        "id": "uuid",
        "nombre": "Repuesto Demo"
      }
    }
  ],
  "total": "150000.00"
}
```

`costo` y `total` son strings decimales con exactamente dos posiciones. El
total se calcula como la suma de los costos de las reparaciones, sin incluir
repuestos, y no se persiste. Un Presupuesto sin repuestos devuelve
`"repuestos": []`; si no se recuperan reparaciones, devuelve
`"reparaciones": []` y `"total": "0.00"`.

El detalle no incluye Sector, Orden de Trabajo ni datos adicionales del
Siniestro.

### Operaciones

| Método y ruta | Propósito | Éxito actual | Errores actuales |
|---|---|---|---|
| `GET /api/presupuestos` | Lista Presupuestos con paginación y resumen del Siniestro | `200` | `400` query inválida |
| `GET /api/presupuestos/[id]` | Obtiene un Presupuesto con reparaciones, repuestos y total derivado | `200` | `400` UUID inválido, `404` inexistente |

El endpoint acepta `page` y `limit` según las convenciones generales de
paginación, ordena establemente por `id` ascendente y devuelve `200 OK` con
`data: []` cuando la página solicitada no contiene resultados.

No están implementados la creación, la modificación, el envío ni las
transiciones de estado de Presupuesto.
