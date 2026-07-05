# Clientes (CRUD)

## Propósito

Segunda de cuatro sub-entregas de la interfaz interna de `projectGest` (después de Shell + Dashboard). Reemplaza la pantalla "Próximamente" de `/dashboard/clientes` por un CRUD real de clientes: alta, edición, borrado y listado con búsqueda.

Sigue sin haber base de datos. Los datos ahora persisten en `localStorage` del navegador (en vez de vivir solo como un array estático en el código), para que el CRUD se sienta funcional mientras no exista un backend real.

## Alcance

Incluye:
- Tabla de clientes con buscador (por nombre/empresa) en `/dashboard/clientes`.
- Alta y edición de cliente vía un modal compartido (mismo formulario para ambos casos).
- Borrado de cliente, bloqueado con aviso si tiene alguna suscripción asociada.
- Validación de formulario: campos requeridos, formato de email válido, email único entre clientes.
- Persistencia en `localStorage`, sembrada la primera vez con los datos mock actuales.
- El Dashboard (`/dashboard`) pasa a leer clientes del mismo store persistente, para que los cambios hechos en el CRUD se reflejen ahí también.
- Rename de `Cliente.numeroTlf` a `Cliente.contactId` en el modelo de datos.

No incluye (specs futuros separados):
- CRUD de Suscripciones (queda con datos fijos del mock, no editable desde la UI todavía).
- Historial de Notificaciones.
- Base de datos / API real — `localStorage` es un paso intermedio, no el destino final.
- Un segundo teléfono de "contacto general": el `{{numero_tlf}}` de la plantilla de recordatorio es un dato de la empresa/agencia (constante propia), no un campo del cliente — queda fuera de este modelo.

## Modelo de datos

```ts
export type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  contactId: string; // teléfono al que se le envía la notificación (ej. WhatsApp)
  email: string; // único entre clientes
};
```

`Suscripcion.clienteId` sigue siendo obligatorio (ya lo era) — toda suscripción debe estar asociada a un cliente existente.

## Persistencia

- Clave de `localStorage`: `projectgest:clientes`.
- **Patrón anti-hidratación** (mismo problema que ya resolvimos en la landing): el estado inicial de React en cualquier componente que use estos datos es el array mock estático de `lib/mock-data.ts` — idéntico en servidor y en el primer render de cliente. Recién dentro de un `useEffect` (que corre después de la hidratación) se lee `localStorage`: si ya tiene datos guardados, reemplazan el estado; si está vacío, se siembra con el mock actual. Así nunca hay un mismatch entre lo que renderiza el servidor y el primer render del cliente.
- Todas las operaciones (crear, editar, borrar) actualizan el estado en memoria y `localStorage` en el mismo paso.

## Validaciones

- `nombre`, `empresa`, `contactId`, `email`: requeridos, no vacíos.
- `email`: formato válido (regex simple) y único entre todos los clientes (comparación case-insensitive); al editar, se excluye al propio cliente de la comparación.
- Errores de validación se muestran inline, debajo del campo correspondiente, sin bloquear la escritura — solo al intentar guardar.

## Borrado

- Antes de borrar, se verifica si existe alguna `Suscripcion` con `clienteId` igual al del cliente a borrar.
- Si existe al menos una: se bloquea el borrado y se muestra un mensaje ("Este cliente tiene N suscripción(es) asociada(s). No se puede borrar.").
- Si no existe ninguna: se pide confirmación simple y se borra.

## Layout y componentes

- **`/dashboard/clientes`**: buscador arriba (filtra por nombre o empresa, case-insensitive, sobre la lista ya cargada — sin llamadas a red), botón "Nuevo cliente" a la derecha del buscador, tabla debajo con columnas Nombre, Empresa, ContactId, Email, Suscripciones (cantidad), y una columna de acciones (Editar / Borrar) por fila.
- **Modal de alta/edición**: mismo componente para ambos casos (recibe el cliente a editar como prop opcional; sin esa prop, es alta). Campos: nombre, empresa, contactId, email. Botones Cancelar / Guardar.
- Sigue el protocolo `minimalist-ui` ya usado en el resto de la app (bordes `1px solid`, sin sombras pesadas, tokens de color existentes). El modal usa un fondo semitransparente simple para el overlay, sin animaciones complejas nuevas.

## Archivos

- `lib/mock-data.ts` — se modifica: `Cliente.numeroTlf` → `Cliente.contactId` (en el tipo y en los 6 registros semilla).
- `lib/clientes-store.ts` — nuevo: hook `useClientes()` que expone `{ clientes, addCliente, updateCliente, deleteCliente, isEmailTaken }`, con la lógica de `localStorage` + siembra + bloqueo de borrado.
- `components/dashboard/cliente-form-modal.tsx` — nuevo: modal de alta/edición con validación.
- `components/dashboard/clientes-table.tsx` — nuevo: buscador + tabla + acciones por fila.
- `app/dashboard/clientes/page.tsx` — se modifica (reemplaza el placeholder `ComingSoon`): orquesta el hook, la tabla y el modal.
- `app/dashboard/page.tsx` — se modifica: pasa a `"use client"`, usa `useClientes()` en vez del array estático para resolver el nombre del cliente en las listas de cobros.

## Testing / verificación

Sin test runner, igual que el resto del proyecto hasta ahora. Verificación manual (navegador real):
- Crear un cliente nuevo, verificar que aparece en la tabla y sobrevive un reload de página.
- Editar un cliente existente y confirmar que el cambio se refleja tanto en la tabla de Clientes como en las listas del Dashboard (si tiene suscripciones vencidas/próximas).
- Intentar borrar un cliente con suscripciones asociadas → debe bloquearse con el aviso.
- Crear un cliente sin suscripciones y borrarlo → debe desaparecer de la tabla y no reaparecer tras reload.
- Intentar guardar con email duplicado (de otro cliente) → debe mostrar el error y no guardar.
- Intentar guardar con campos vacíos → debe mostrar los errores correspondientes.
- Buscar por nombre y por empresa → la tabla filtra correctamente.
- Responsive en mobile/desktop, tema claro/oscuro sigue funcionando en la tabla y el modal.
