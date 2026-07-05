# Suscripciones (CRUD)

## Propósito

Tercera de cuatro sub-entregas de la interfaz interna de `projectGest` (después de Shell + Dashboard y Clientes). Reemplaza la pantalla "Próximamente" de `/dashboard/suscripciones` por un CRUD real: alta, edición, borrado y listado con búsqueda, vinculando cada suscripción a un cliente existente.

Sigue el mismo patrón de persistencia que Clientes: `localStorage`, sin base de datos real todavía.

## Alcance

Incluye:
- Tabla de suscripciones con buscador (por cliente o servicio) en `/dashboard/suscripciones`.
- Alta y edición de suscripción vía un modal compartido, con selector de cliente (desplegable de clientes existentes), servicio (texto libre), monto, ciclo (mensual/trimestral/anual) y próximo cobro (fecha manual).
- Borrado de suscripción, sin restricciones (nada depende de una suscripción).
- Filas vencidas (próximo cobro anterior a hoy) resaltadas con el mismo acento rojo que ya usa el Dashboard.
- Persistencia en `localStorage`, sembrada la primera vez con los datos mock actuales.
- El Dashboard y el chequeo de "borrado bloqueado" de Clientes pasan a leer del mismo store persistente de suscripciones, en vez del array estático de `lib/mock-data.ts`.

No incluye (specs futuros separados):
- Historial de Notificaciones.
- Cálculo automático de la siguiente fecha de cobro tras pagar (la fecha se carga y edita a mano).
- Catálogo de servicios predefinidos (el servicio es texto libre).
- Base de datos / API real.

## Modelo de datos

Sin cambios de forma sobre el tipo ya existente:

```ts
export type Suscripcion = {
  id: string;
  clienteId: string;
  servicio: string;
  monto: number;
  ciclo: "mensual" | "trimestral" | "anual";
  proximoCobro: string; // ISO date (YYYY-MM-DD)
};
```

Lo que cambia es dónde vive: pasa de ser un array estático consumido directamente, a estar respaldado por `localStorage` a través de un hook (`useSuscripciones`), igual que `Cliente` con `useClientes`.

## Persistencia

- Clave de `localStorage`: `projectgest:suscripciones`.
- Mismo patrón anti-hidratación que `useClientes`: estado inicial = array mock estático (idéntico en servidor y primer render de cliente), y recién en un `useEffect` post-hidratación se lee/sincroniza con `localStorage`.
- Alta, edición y borrado actualizan el estado en memoria y `localStorage` en el mismo paso.

## Validaciones

- `clienteId`: obligatorio — debe ser un cliente existente seleccionado del desplegable. Si no hay clientes cargados, el desplegable aparece vacío y el intento de guardar sin seleccionar uno muestra el error correspondiente.
- `servicio`: obligatorio, no vacío.
- `monto`: obligatorio, número mayor a 0.
- `ciclo`: obligatorio (select con las 3 opciones, `mensual` por defecto).
- `proximoCobro`: obligatorio, fecha válida.

## Layout y componentes

- **`/dashboard/suscripciones`**: buscador arriba (filtra por nombre de cliente o servicio, case-insensitive), botón "Nueva suscripción", tabla debajo con columnas Cliente, Servicio, Monto, Ciclo, Próximo cobro, Acciones.
- **Filas vencidas**: si `proximoCobro` es anterior a hoy, la fila usa los tokens de acento (`--color-danger-bg`/`--color-danger-text`), igual criterio que `getCobrosVencidos` en el Dashboard.
- **Modal de alta/edición**: mismo componente para ambos casos. Campos: cliente (`<select>` con los clientes de `useClientes`), servicio (texto), monto (número), ciclo (select), próximo cobro (`type="date"`). Botones Cancelar / Guardar. Mismo patrón de remount vía `key` que ya usa `ClienteFormModal` (sin `useEffect` para resetear el formulario).
- Acciones de la tabla con los mismos íconos ya agregados a Clientes (`Pencil2Icon` / `TrashIcon` de `@radix-ui/react-icons`).

## Archivos

- `lib/suscripciones-store.ts` — nuevo: hook `useSuscripciones()` análogo a `useClientes()`, expone `{ suscripciones, addSuscripcion, updateSuscripcion, deleteSuscripcion }`.
- `components/dashboard/suscripcion-form-modal.tsx` — nuevo: modal de alta/edición con selector de cliente y validación.
- `components/dashboard/suscripciones-table.tsx` — nuevo: buscador + tabla + resaltado de vencidas + acciones.
- `app/dashboard/suscripciones/page.tsx` — se modifica (reemplaza el placeholder `ComingSoon`): orquesta `useClientes()` (para el selector) + `useSuscripciones()` + la tabla y el modal.
- `app/dashboard/page.tsx` — se modifica: usa `useSuscripciones()` en vez del array estático `suscripciones` de `lib/mock-data.ts` para las 3 métricas y las listas.
- `app/dashboard/clientes/page.tsx` — se modifica: la función `borrar` usa las suscripciones de `useSuscripciones()` en vez del array estático, para que el bloqueo de borrado refleje altas/bajas reales de suscripciones.

## Testing / verificación

Sin test runner, igual que el resto del proyecto. Verificación manual (navegador real):
- Crear una suscripción nueva para un cliente existente, verificar que aparece en la tabla y sobrevive un reload.
- Editar una suscripción (cambiar monto, ciclo o cliente asociado) y confirmar que el Dashboard refleja el cambio.
- Borrar una suscripción y confirmar que desaparece de la tabla, del Dashboard, y que el cliente correspondiente ahora puede borrarse en Clientes si esa era su única suscripción.
- Intentar guardar sin seleccionar cliente, sin servicio, con monto vacío o cero → errores correspondientes, nada se guarda.
- Verificar que las filas con próximo cobro vencido se ven con el acento rojo, y que el resto no.
- Buscar por nombre de cliente y por servicio → la tabla filtra correctamente.
- Responsive en mobile/desktop, tema claro/oscuro funcionando en la tabla y el modal.
