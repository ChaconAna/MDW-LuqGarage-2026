# Contrato HTTP actual — LuqGarage

Este documento describe exclusivamente la API implementada actualmente para
Cliente, Aseguradora, Vehículo, Siniestro, Presupuesto y Orden de Trabajo. No
documenta operaciones futuras de transición de Presupuesto ni endpoints de
catálogos.

## Autenticación y autorización

Todos los endpoints de dominio documentados requieren una sesión autenticada.
La identidad se autentica mediante Google y Auth.js; cada operación verifica en
el servidor el Usuario local activo y su rol vigente. Los roles permitidos se
indican en la tabla de operaciones de cada recurso.

- `401 Unauthorized`: no existe una sesión local válida o el Usuario local no
  existe o está inactivo. El body es `{ "error": "No autenticado" }`.
- `403 Forbidden`: existe un Usuario local activo, pero su rol no está permitido
  para la operación. El body es
  `{ "error": "No podés realizar esta operación" }`.

Los roles no se obtienen de datos enviados por el cliente. Ningún endpoint de
dominio existente otorga acceso operativo por defecto a `ADMINISTRADOR`.

## Convenciones

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
- Los errores de autenticación y autorización se resuelven antes de la lógica
  específica de cada operación.

### Paginación

Los seis endpoints de listado aceptan:

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

Todas las operaciones requieren `RECEPCIONISTA` o `ENCARGADO_DEL_TALLER`.

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

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/clientes` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Lista clientes con paginación | `200` | `400` query inválida |
| `POST /api/clientes` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Crea un cliente activo | `201` | `400` body inválido, `404` Localidad inexistente, `409` DNI duplicado |
| `GET /api/clientes/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Obtiene un cliente activo o inactivo | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/clientes/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` Cliente o Localidad inexistente, `409` DNI duplicado |
| `DELETE /api/clientes/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

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

Todas las operaciones requieren `RECEPCIONISTA` o `ENCARGADO_DEL_TALLER`.

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

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/aseguradoras` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Lista aseguradoras con paginación | `200` | `400` query inválida |
| `POST /api/aseguradoras` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Crea una aseguradora activa | `201` | `400` body inválido, `409` CUIT duplicado |
| `GET /api/aseguradoras/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Obtiene una aseguradora activa o inactiva | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/aseguradoras/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` inexistente, `409` CUIT duplicado |
| `DELETE /api/aseguradoras/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

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

Todas las operaciones requieren `RECEPCIONISTA` o `ENCARGADO_DEL_TALLER`.

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

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/vehiculos` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Lista vehículos con paginación | `200` | `400` query inválida |
| `POST /api/vehiculos` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Crea un vehículo activo | `201` | `400` body/UUID inválido, `404` Modelo o TipoVehiculo inexistente, `409` patente duplicada |
| `GET /api/vehiculos/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Obtiene un vehículo activo o inactivo | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/vehiculos/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Modifica parcialmente sus datos | `200` | `400` UUID/body inválido, `404` Vehículo, Modelo o TipoVehiculo inexistente, `409` patente duplicada |
| `DELETE /api/vehiculos/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Realiza su baja lógica | `204` sin body | `400` UUID inválido, `404` inexistente |

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

Todas las operaciones requieren `RECEPCIONISTA` o `ENCARGADO_DEL_TALLER`.

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
  "estado": "PRESUPUESTADO",
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

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/siniestros` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Lista Siniestros con paginación, sin documentos | `200` | `400` query inválida |
| `POST /api/siniestros` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Registra un Siniestro con toda su documentación | `201` | `400` formulario/RN02/RN06 inválidos, `404` relación inexistente, `409` número duplicado o relación inactiva, `502` fallo de Storage |
| `GET /api/siniestros/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Obtiene un Siniestro con sus documentos | `200` | `400` UUID inválido, `404` inexistente |

### POST `/api/siniestros`

El request usa `multipart/form-data` y requiere los siguientes campos de texto:

| Campo | Descripción |
|---|---|
| `numeroSiniestro` | Número de Siniestro no vacío. |
| `fechaSiniestro` | Timestamp ISO válido con offset. |
| `gradoDano` | `LEVE`, `MODERADO` o `GRAVE`. |
| `numeroPoliza` | Número de póliza no vacío. |
| `clienteId` | UUID. |
| `vehiculoId` | UUID. |
| `aseguradoraId` | UUID. |

Cada documento se representa mediante dos partes del formulario con el mismo
índice no negativo `n`:

```text
documentos[n][tipo]     = categoría documental
documentos[n][archivo]  = archivo
```

El índice solo asocia el tipo con su archivo. Cada par debe contener ambos
campos. El cliente envía los archivos y no puede enviar `referenciaArchivo`;
esa referencia es generada por el servidor luego de una carga exitosa en
Storage.

Los documentos deben incluir exactamente un archivo de cada tipo obligatorio:
`DENUNCIA`, `LATERAL_DERECHA`, `LATERAL_IZQUIERDA`, `FRONTAL`, `TRASERA` y
`CERTIFICADO_COBERTURA`. También pueden incluir cero o más documentos de tipo
`ADICIONAL`.

`fechaSiniestro` no puede ser posterior a la fecha de registro capturada por
el servidor. La respuesta `201` utiliza la representación del detalle definida
arriba.

Una relación inexistente devuelve `404`. Una relación existente pero inactiva
o un `numeroSiniestro` duplicado devuelve `409`. Una fecha posterior a la de
registro, una composición documental que incumple RN06 o un formulario
multipart inválido devuelve `400`.

Si no es posible almacenar la documentación, devuelve `502` con:

```json
{ "error": "No fue posible almacenar la documentación." }
```

No están implementados `PATCH` ni `DELETE` de Siniestro.

## Presupuesto

`RECEPCIONISTA` y `ENCARGADO_DEL_TALLER` pueden consultar Presupuestos.
Solo `ENCARGADO_DEL_TALLER` puede crearlos o modificarlos.

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
repuestos, y no se persiste. Todo Presupuesto válido contiene al menos una
reparación. Un Presupuesto sin repuestos devuelve `"repuestos": []`.

El detalle no incluye Sector, Orden de Trabajo ni datos adicionales del
Siniestro.

### Operaciones

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/presupuestos` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Lista Presupuestos con paginación y resumen del Siniestro | `200` | `400` query inválida |
| `POST /api/presupuestos` | `ENCARGADO_DEL_TALLER` | Crea un Presupuesto en estado `BORRADOR` con sus detalles | `201` | `400` body inválido, `404` referencia inexistente, `409` número duplicado |
| `GET /api/presupuestos/[id]` | `RECEPCIONISTA`, `ENCARGADO_DEL_TALLER` | Obtiene un Presupuesto con reparaciones, repuestos y total derivado | `200` | `400` UUID inválido, `404` inexistente |
| `PATCH /api/presupuestos/[id]` | `ENCARGADO_DEL_TALLER` | Reemplaza Reparaciones y/o Repuestos de un Presupuesto en `BORRADOR` | `200` | `400` UUID/body inválido, `404` Presupuesto o referencia inexistente, `409` estado no editable |

El endpoint acepta `page` y `limit` según las convenciones generales de
paginación, ordena establemente por `id` ascendente y devuelve `200 OK` con
`data: []` cuando la página solicitada no contiene resultados.

### POST `/api/presupuestos`

Body:

```json
{
  "numeroPresupuesto": "PRES-2026-002",
  "siniestroId": "uuid",
  "reparaciones": [
    {
      "reparacionId": "uuid",
      "costo": "150000.00"
    }
  ],
  "repuestos": [
    {
      "repuestoId": "uuid",
      "cantidad": 2
    }
  ]
}
```

`reparaciones` debe contener al menos un elemento y no puede repetir una
Reparación. `costo` es un string no negativo con exactamente dos decimales,
entre `"0.00"` y `"9999999999.99"`.

`repuestos` es opcional: puede omitirse o enviarse como `[]`. Cuando contiene
elementos, no puede repetir un Repuesto y cada `cantidad` debe ser un entero
mayor o igual a `1` dentro del rango de Prisma `Int`.

La respuesta `201` reutiliza la representación del detalle, con estado
`BORRADOR`, costos y total como strings con dos decimales. La creación del
Presupuesto, sus detalles y la actualización del Siniestro son atómicas. Si el
Siniestro estaba `REGISTRADO`, pasa a `PRESUPUESTADO`; si ya estaba
`PRESUPUESTADO`, conserva ese estado y admite el nuevo Presupuesto.

Un JSON malformado o un body inválido devuelve `400`. Devuelve `404` si no
existe el Siniestro o alguna Reparación o Repuesto solicitado. Un
`numeroPresupuesto` ya utilizado devuelve `409`.

### PATCH `/api/presupuestos/[id]`

Permite reemplazar las Reparaciones y/o los Repuestos de un Presupuesto que
permanezca en estado `BORRADOR`. El body acepta cualquier subconjunto no vacío
de estas dos colecciones:

```json
{
  "reparaciones": [
    {
      "reparacionId": "uuid",
      "costo": "175000.00"
    }
  ],
  "repuestos": [
    {
      "repuestoId": "uuid",
      "cantidad": 1
    }
  ]
}
```

Una colección presente reemplaza completamente la colección existente. Una
colección omitida se conserva sin cambios. `reparaciones` debe contener al
menos un elemento cuando se informa; `repuestos: []` es válido y elimina todos
los Repuestos. El body `{}` es inválido.

El body es estricto. `numeroPresupuesto` y `siniestroId` se establecen en la
creación y son inmutables. Tampoco se aceptan `id`, `estado`,
`ordenTrabajoId`, `total`, IDs de detalles ni otros campos adicionales.

La respuesta `200` reutiliza la representación del detalle y recalcula el
total a partir de las Reparaciones resultantes. El reemplazo se realiza de
forma atómica y no persiste el total.

Un UUID, JSON o body inválido devuelve `400`. Devuelve `404` si no existe el
Presupuesto o alguna Reparación o Repuesto informado. Si el Presupuesto existe
pero no permanece en `BORRADOR`, devuelve `409`; la misma respuesta se utiliza
si pierde esa condición concurrentemente antes de la escritura.

No están implementados el envío ni las transiciones de estado de Presupuesto.

## Orden de Trabajo

`ENCARGADO_DEL_TALLER` puede consultar y gestionar las operaciones existentes
de Órdenes de Trabajo. `MECANICO` solo puede consultar Órdenes de Trabajo en
estado `FINALIZADA`.

Para `ENCARGADO_DEL_TALLER`, el listado incluye Órdenes de Trabajo en ambos
estados: `BORRADOR` y `FINALIZADA`. Para `MECANICO`, el listado y el detalle
solo exponen OTs `FINALIZADA`. Al consultar una OT `BORRADOR`, `MECANICO`
recibe el mismo `404` que para una OT inexistente.

### Representación del listado

```json
{
  "id": "uuid",
  "estado": "FINALIZADA",
  "siniestro": {
    "id": "uuid",
    "numeroSiniestro": "SIN-SEED-VALIDO-001"
  }
}
```

La representación resumida no incluye Presupuestos, Sectores, Reparaciones,
observaciones, cantidades calculadas ni otros datos del Siniestro. El modelo
actual tampoco contiene un número propio ni fechas para la Orden de Trabajo.

### Representación del detalle

El detalle contiene los campos de la representación del listado y agrega los
Presupuestos asociados y las tareas organizadas por Sector:

```json
{
  "presupuestos": [
    {
      "id": "uuid-presupuesto",
      "numeroPresupuesto": "PRES-SEED-001",
      "estado": "APROBADO"
    }
  ],
  "sectores": [
    {
      "id": "uuid-sector",
      "nombre": "Reparación",
      "observacion": "Observación ficticia del seed",
      "reparaciones": [
        {
          "detalleReparacionId": "uuid-detalle",
          "presupuestoId": "uuid-presupuesto",
          "reparacion": {
            "id": "uuid-reparacion",
            "nombre": "Reparación Demo de Chapa"
          }
        }
      ]
    }
  ]
}
```

Cada `DetalleReparacion` produce una tarea independiente y conserva el
`presupuestoId` de origen. Las tareas se agrupan únicamente por Sector y no se
deduplican por `reparacionId`; dos detalles que referencien la misma Reparación
aparecen como dos ocurrencias. La observación corresponde a la relación
`OrdenTrabajoSector` del Sector.

El detalle no incluye costos, Repuestos, total, número de Orden de Trabajo,
fechas ni datos adicionales del Siniestro o de los Presupuestos.

### Operaciones

| Método y ruta | Roles permitidos | Propósito | Éxito | Errores específicos |
|---|---|---|---|---|
| `GET /api/ordenes-trabajo` | `ENCARGADO_DEL_TALLER`; `MECANICO` solo `FINALIZADA` | Lista Órdenes de Trabajo con paginación y resumen del Siniestro | `200` | `400` query inválida |
| `POST /api/ordenes-trabajo` | `ENCARGADO_DEL_TALLER` | Crea una Orden de Trabajo a partir de Presupuestos aprobados | `201` | `400` JSON/body inválido, `404` referencia inexistente, `409` regla de negocio |
| `GET /api/ordenes-trabajo/[id]` | `ENCARGADO_DEL_TALLER`; `MECANICO` solo `FINALIZADA` | Obtiene una Orden de Trabajo con Presupuestos y tareas organizadas por Sector | `200` | `400` UUID inválido, `404` inexistente o no visible para Mecánico |
| `PATCH /api/ordenes-trabajo/[id]` | `ENCARGADO_DEL_TALLER` | Modifica observaciones de Sectores de una Orden de Trabajo en `BORRADOR` | `200` | `400` path/JSON/body inválido, `404` recurso inexistente, `409` regla de negocio |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | `ENCARGADO_DEL_TALLER` | Agrega Presupuestos a una Orden de Trabajo en `BORRADOR` | `200` | `400` path/JSON/body inválido, `404` recurso inexistente, `409` regla de negocio |
| `POST /api/ordenes-trabajo/[id]/finalizar` | `ENCARGADO_DEL_TALLER` | Finaliza una Orden de Trabajo en `BORRADOR` | `200` | `400` UUID inválido, `404` inexistente, `409` regla de negocio |

El endpoint acepta `page` como entero positivo con default `1` y `limit` entre
`1` y `100` con default `10`. Ordena establemente por `id` ascendente y devuelve
`200 OK` con `data: []`, `total: 0` y `totalPages: 0` cuando no existen
resultados.

Una query de paginación inválida devuelve `400` con
`{ "error": "Los parámetros de paginación son inválidos." }`. Una excepción
inesperada devuelve `500` con `{ "error": "Error interno" }`.

El alta recibe exclusivamente un `siniestroId` UUID y un array
`presupuestoIds` con uno o más UUID sin repetir:

```json
{
  "siniestroId": "uuid",
  "presupuestoIds": ["uuid-presupuesto-1", "uuid-presupuesto-2"]
}
```

Todos los Presupuestos deben existir, estar `APROBADO`, pertenecer al
Siniestro indicado y no estar asociados a otra Orden de Trabajo. La operación
crea la Orden de Trabajo en `BORRADOR`, asocia todos los Presupuestos y crea una
relación `OrdenTrabajoSector` con `observacion: null` por cada Sector distinto
derivado de sus Reparaciones. Es atómica: si no puede asociarse la totalidad,
no conserva la Orden de Trabajo ni asociaciones o Sectores parciales.

Las tareas no se copian ni se persisten nuevamente. El detalle `201` usa la
misma representación que `GET /api/ordenes-trabajo/[id]`: cada
`DetalleReparacion` continúa siendo una ocurrencia independiente, aunque otra
ocurrencia referencie la misma Reparación.

Un JSON malformado devuelve `400` con
`{ "error": "El cuerpo de la solicitud no es un JSON válido." }`; un body que
no cumple el contrato devuelve `400` con
`{ "error": "Los datos de la Orden de Trabajo son inválidos." }`. Un Siniestro
inexistente devuelve `404` con `{ "error": "Siniestro no encontrado." }` y la
ausencia de uno o más Presupuestos devuelve `404` con
`{ "error": "Uno o más Presupuestos no fueron encontrados." }`.

Si algún Presupuesto no está aprobado, pertenece a otro Siniestro o ya está
asociado a una Orden de Trabajo, devuelve respectivamente `409` con
`{ "error": "Uno o más Presupuestos no están aprobados." }`,
`{ "error": "Uno o más Presupuestos no pertenecen al Siniestro indicado." }`
o `{ "error": "Uno o más Presupuestos ya están asociados a otra Orden de Trabajo." }`.

La modificación de una Orden de Trabajo recibe exclusivamente uno o más
Sectores con su nueva observación:

```json
{
  "sectores": [
    {
      "sectorId": "uuid-sector-1",
      "observacion": "Priorizar lateral izquierdo"
    },
    {
      "sectorId": "uuid-sector-2",
      "observacion": null
    }
  ]
}
```

Sólo pueden modificarse Sectores que ya pertenezcan a una Orden de Trabajo en
estado `BORRADOR`. Los Sectores omitidos permanecen sin cambios. `null` elimina
la observación y el string vacío se conserva literalmente. La operación no
permite modificar estado, Siniestro, Presupuestos, tareas, reparaciones ni la
composición de Sectores, y actualiza atómicamente todas las observaciones
indicadas. La respuesta `200` utiliza la misma representación del GET detalle.

Un Sector inexistente devuelve `404` con
`{ "error": "Uno o más Sectores no fueron encontrados." }`. Una Orden de
Trabajo que no está en `BORRADOR` devuelve `409` con
`{ "error": "La Orden de Trabajo no está en estado BORRADOR." }`. Un Sector
existente que no pertenece a la Orden de Trabajo devuelve `409` con
`{ "error": "Uno o más Sectores no pertenecen a la Orden de Trabajo." }`.

La incorporación posterior de Presupuestos recibe exclusivamente un array no
vacío de UUID sin repetir:

```json
{
  "presupuestoIds": ["uuid-presupuesto-1", "uuid-presupuesto-2"]
}
```

La operación es aditiva: no quita, reemplaza ni reasigna Presupuestos. La Orden
de Trabajo debe permanecer en `BORRADOR` y cada nuevo Presupuesto debe existir,
estar `APROBADO`, pertenecer al mismo Siniestro y no estar asociado a ninguna
Orden de Trabajo. Volver a agregar un Presupuesto que ya pertenece a la misma
Orden de Trabajo también es inválido.

Las tareas continúan derivándose de los `DetalleReparacion` y no se persisten
nuevamente. Sólo se crean las relaciones con Sectores que todavía no estaban
incluidos, con `observacion: null`; las relaciones existentes y sus
observaciones se conservan sin cambios. La incorporación completa es atómica y
la respuesta `200` utiliza la misma representación del GET detalle.

Un Presupuesto inexistente devuelve `404` con
`{ "error": "Uno o más Presupuestos no fueron encontrados." }`. Devuelve `409`
si la OT no está en `BORRADOR`, si algún Presupuesto no está aprobado, pertenece
a otro Siniestro, ya pertenece a esa misma OT o está asociado a otra OT, con los
mensajes específicos documentados en los ejemplos HTTP.

Un UUID inválido devuelve `400` con
`{ "error": "El id debe ser un UUID válido." }`. Una Orden de Trabajo
inexistente devuelve `404` con
`{ "error": "Orden de Trabajo no encontrada." }`.

La finalización no recibe body. La Orden de Trabajo debe existir, permanecer en
`BORRADOR`, tener al menos un Presupuesto, conservar todos sus Presupuestos en
`APROBADO` y contener una relación `OrdenTrabajoSector` para el Sector de cada
Reparación derivada. Las observaciones nulas o vacías no impiden finalizar.

La operación cambia exclusivamente el estado de la Orden de Trabajo a
`FINALIZADA` y responde `200` con la misma representación que el GET detalle.
No modifica el Siniestro, los estados o asociaciones de los Presupuestos, las
relaciones con Sectores, sus observaciones ni los detalles derivados.

Una Orden de Trabajo que no está en `BORRADOR` devuelve `409` con
`{ "error": "La Orden de Trabajo no está en estado BORRADOR." }`. La ausencia
de Presupuestos devuelve `409` con
`{ "error": "La Orden de Trabajo debe tener al menos un Presupuesto aprobado." }`.
Si algún Presupuesto no está aprobado o alguna Reparación carece de la relación
con su Sector en la OT, devuelve respectivamente `409` con
`{ "error": "Uno o más Presupuestos de la Orden de Trabajo no están aprobados." }`
o `{ "error": "La Orden de Trabajo tiene Reparaciones sin sectorizar." }`.

No está implementada la eliminación de Órdenes de Trabajo.

## Catálogo de errores

Las tablas siguientes reflejan los errores controlados por cada operación. En
todos los casos, el body tiene la forma `{ "error": "mensaje" }`. Además,
**cualquiera de las operaciones documentadas** puede responder `500` ante una
excepción inesperada, con el mensaje exacto `Error interno`.

### Autenticación y autorización

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| Cualquier operación de dominio | Sin sesión local válida, Usuario inexistente o inactivo | `401` | `No autenticado` |
| Cualquier operación de dominio | Rol local no permitido para la operación | `403` | `No podés realizar esta operación` |

### Cliente

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/clientes` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/clientes` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/clientes` | Body inválido | `400` | `Los datos del Cliente son inválidos.` |
| `POST /api/clientes` | Localidad inexistente | `404` | `Localidad no encontrada.` |
| `POST /api/clientes` | DNI duplicado | `409` | `Ya existe un Cliente con el DNI indicado.` |
| `GET /api/clientes/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/clientes/[id]` | Cliente inexistente | `404` | `Cliente no encontrado.` |
| `PATCH /api/clientes/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `PATCH /api/clientes/[id]` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `PATCH /api/clientes/[id]` | Body inválido | `400` | `Los datos del Cliente son inválidos.` |
| `PATCH /api/clientes/[id]` | Cliente inexistente | `404` | `Cliente no encontrado.` |
| `PATCH /api/clientes/[id]` | Localidad inexistente | `404` | `Localidad no encontrada.` |
| `PATCH /api/clientes/[id]` | DNI duplicado | `409` | `Ya existe un Cliente con el DNI indicado.` |
| `DELETE /api/clientes/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `DELETE /api/clientes/[id]` | Cliente inexistente | `404` | `Cliente no encontrado.` |

### Aseguradora

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/aseguradoras` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/aseguradoras` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/aseguradoras` | Body inválido | `400` | `Los datos de la Aseguradora son inválidos.` |
| `POST /api/aseguradoras` | CUIT duplicado | `409` | `Ya existe una Aseguradora con el CUIT indicado.` |
| `GET /api/aseguradoras/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/aseguradoras/[id]` | Aseguradora inexistente | `404` | `Aseguradora no encontrada.` |
| `PATCH /api/aseguradoras/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `PATCH /api/aseguradoras/[id]` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `PATCH /api/aseguradoras/[id]` | Body inválido | `400` | `Los datos de la Aseguradora son inválidos.` |
| `PATCH /api/aseguradoras/[id]` | Aseguradora inexistente | `404` | `Aseguradora no encontrada.` |
| `PATCH /api/aseguradoras/[id]` | CUIT duplicado | `409` | `Ya existe una Aseguradora con el CUIT indicado.` |
| `DELETE /api/aseguradoras/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `DELETE /api/aseguradoras/[id]` | Aseguradora inexistente | `404` | `Aseguradora no encontrada.` |

### Vehículo

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/vehiculos` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/vehiculos` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/vehiculos` | Body inválido | `400` | `Los datos del Vehículo son inválidos.` |
| `POST /api/vehiculos` | Modelo o Tipo de Vehículo inexistente | `404` | `Modelo o Tipo de Vehículo no encontrado.` |
| `POST /api/vehiculos` | Patente duplicada | `409` | `Ya existe un Vehículo con la patente indicada.` |
| `GET /api/vehiculos/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/vehiculos/[id]` | Vehículo inexistente | `404` | `Vehículo no encontrado.` |
| `PATCH /api/vehiculos/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `PATCH /api/vehiculos/[id]` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `PATCH /api/vehiculos/[id]` | Body inválido | `400` | `Los datos del Vehículo son inválidos.` |
| `PATCH /api/vehiculos/[id]` | Vehículo inexistente | `404` | `Vehículo no encontrado.` |
| `PATCH /api/vehiculos/[id]` | Modelo o Tipo de Vehículo inexistente | `404` | `Modelo o Tipo de Vehículo no encontrado.` |
| `PATCH /api/vehiculos/[id]` | Patente duplicada | `409` | `Ya existe un Vehículo con la patente indicada.` |
| `DELETE /api/vehiculos/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `DELETE /api/vehiculos/[id]` | Vehículo inexistente | `404` | `Vehículo no encontrado.` |

### Siniestro

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/siniestros` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/siniestros` | Formulario multipart inválido, incluida la documentación RN06 | `400` | `Los datos del Siniestro son inválidos.` |
| `POST /api/siniestros` | Fecha del Siniestro posterior a la fecha de registro, RN02 | `400` | `La fecha del Siniestro no puede ser posterior a la fecha de registro.` |
| `POST /api/siniestros` | Cliente inexistente | `404` | `Cliente no encontrado.` |
| `POST /api/siniestros` | Vehículo inexistente | `404` | `Vehículo no encontrado.` |
| `POST /api/siniestros` | Aseguradora inexistente | `404` | `Aseguradora no encontrada.` |
| `POST /api/siniestros` | Cliente inactivo | `409` | `El Cliente indicado está inactivo.` |
| `POST /api/siniestros` | Vehículo inactivo | `409` | `El Vehículo indicado está inactivo.` |
| `POST /api/siniestros` | Aseguradora inactiva | `409` | `La Aseguradora indicada está inactiva.` |
| `POST /api/siniestros` | Número de Siniestro duplicado | `409` | `Ya existe un Siniestro con el número indicado.` |
| `POST /api/siniestros` | No fue posible almacenar la documentación | `502` | `No fue posible almacenar la documentación.` |
| `GET /api/siniestros/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/siniestros/[id]` | Siniestro inexistente | `404` | `Siniestro no encontrado.` |

### Presupuesto

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/presupuestos` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/presupuestos` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/presupuestos` | Body inválido | `400` | `Los datos del Presupuesto son inválidos.` |
| `POST /api/presupuestos` | Siniestro inexistente | `404` | `Siniestro no encontrado.` |
| `POST /api/presupuestos` | Una o más Reparaciones inexistentes | `404` | `Una o más Reparaciones no fueron encontradas.` |
| `POST /api/presupuestos` | Uno o más Repuestos inexistentes | `404` | `Uno o más Repuestos no fueron encontrados.` |
| `POST /api/presupuestos` | Número de Presupuesto duplicado | `409` | `Ya existe un Presupuesto con el número indicado.` |
| `GET /api/presupuestos/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/presupuestos/[id]` | Presupuesto inexistente | `404` | `Presupuesto no encontrado.` |
| `PATCH /api/presupuestos/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `PATCH /api/presupuestos/[id]` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `PATCH /api/presupuestos/[id]` | Body inválido | `400` | `Los datos del Presupuesto son inválidos.` |
| `PATCH /api/presupuestos/[id]` | Presupuesto inexistente | `404` | `Presupuesto no encontrado.` |
| `PATCH /api/presupuestos/[id]` | Una o más Reparaciones inexistentes | `404` | `Una o más Reparaciones no fueron encontradas.` |
| `PATCH /api/presupuestos/[id]` | Uno o más Repuestos inexistentes | `404` | `Uno o más Repuestos no fueron encontrados.` |
| `PATCH /api/presupuestos/[id]` | Presupuesto fuera de `BORRADOR` o cambio concurrente de estado | `409` | `El Presupuesto sólo puede modificarse en estado BORRADOR.` |

### Orden de Trabajo

| Operación | Situación | Status | Mensaje exacto |
|---|---|---:|---|
| `GET /api/ordenes-trabajo` | Paginación inválida | `400` | `Los parámetros de paginación son inválidos.` |
| `POST /api/ordenes-trabajo` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/ordenes-trabajo` | Body inválido | `400` | `Los datos de la Orden de Trabajo son inválidos.` |
| `POST /api/ordenes-trabajo` | Siniestro inexistente | `404` | `Siniestro no encontrado.` |
| `POST /api/ordenes-trabajo` | Uno o más Presupuestos inexistentes | `404` | `Uno o más Presupuestos no fueron encontrados.` |
| `POST /api/ordenes-trabajo` | Uno o más Presupuestos no aprobados | `409` | `Uno o más Presupuestos no están aprobados.` |
| `POST /api/ordenes-trabajo` | Uno o más Presupuestos pertenecen a otro Siniestro | `409` | `Uno o más Presupuestos no pertenecen al Siniestro indicado.` |
| `POST /api/ordenes-trabajo` | Uno o más Presupuestos ya están asociados | `409` | `Uno o más Presupuestos ya están asociados a otra Orden de Trabajo.` |
| `GET /api/ordenes-trabajo/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `GET /api/ordenes-trabajo/[id]` | Orden de Trabajo inexistente | `404` | `Orden de Trabajo no encontrada.` |
| `PATCH /api/ordenes-trabajo/[id]` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `PATCH /api/ordenes-trabajo/[id]` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `PATCH /api/ordenes-trabajo/[id]` | Body inválido | `400` | `Los datos de la Orden de Trabajo son inválidos.` |
| `PATCH /api/ordenes-trabajo/[id]` | Orden de Trabajo inexistente | `404` | `Orden de Trabajo no encontrada.` |
| `PATCH /api/ordenes-trabajo/[id]` | Uno o más Sectores inexistentes | `404` | `Uno o más Sectores no fueron encontrados.` |
| `PATCH /api/ordenes-trabajo/[id]` | Orden de Trabajo fuera de `BORRADOR` | `409` | `La Orden de Trabajo no está en estado BORRADOR.` |
| `PATCH /api/ordenes-trabajo/[id]` | Uno o más Sectores no pertenecen a la Orden | `409` | `Uno o más Sectores no pertenecen a la Orden de Trabajo.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | JSON malformado | `400` | `El cuerpo de la solicitud no es un JSON válido.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Body inválido | `400` | `Los datos para agregar Presupuestos son inválidos.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Orden de Trabajo inexistente | `404` | `Orden de Trabajo no encontrada.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Uno o más Presupuestos inexistentes | `404` | `Uno o más Presupuestos no fueron encontrados.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Orden de Trabajo fuera de `BORRADOR` | `409` | `La Orden de Trabajo no está en estado BORRADOR.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Uno o más Presupuestos no aprobados | `409` | `Uno o más Presupuestos no están aprobados.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Uno o más Presupuestos pertenecen a otro Siniestro | `409` | `Uno o más Presupuestos no pertenecen al Siniestro de la Orden de Trabajo.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Uno o más Presupuestos ya pertenecen a esta Orden | `409` | `Uno o más Presupuestos ya pertenecen a esta Orden de Trabajo.` |
| `POST /api/ordenes-trabajo/[id]/presupuestos` | Uno o más Presupuestos están asociados a otra Orden | `409` | `Uno o más Presupuestos ya están asociados a otra Orden de Trabajo.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | ID con formato inválido | `400` | `El id debe ser un UUID válido.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | Orden de Trabajo inexistente | `404` | `Orden de Trabajo no encontrada.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | Orden de Trabajo fuera de `BORRADOR` | `409` | `La Orden de Trabajo no está en estado BORRADOR.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | Orden de Trabajo sin Presupuestos | `409` | `La Orden de Trabajo debe tener al menos un Presupuesto aprobado.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | Uno o más Presupuestos asociados no están aprobados | `409` | `Uno o más Presupuestos de la Orden de Trabajo no están aprobados.` |
| `POST /api/ordenes-trabajo/[id]/finalizar` | Una o más Reparaciones no tienen Sector asociado | `409` | `La Orden de Trabajo tiene Reparaciones sin sectorizar.` |
