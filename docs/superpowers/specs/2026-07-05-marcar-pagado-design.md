# Marcar como pagado + Detalle de cliente con timeline

## Propósito

Cierra el ciclo de cobro de una suscripción: al confirmar que un cliente pagó, se calcula y confirma la próxima fecha de cobro, y queda un registro histórico del pago. Ese historial se visualiza como un timeline dentro de una nueva página de detalle por cliente.

Sigue sin haber base de datos — mismo patrón de `localStorage` que Clientes y Suscripciones.

## Alcance

Incluye:
- Un tercer ícono de acción ("Marcar como pagado") en la tabla de Suscripciones, junto a Editar/Borrar.
- Un diálogo de confirmación que sugiere la próxima fecha de cobro (fecha de cobro actual + 1 mes / 3 meses / 1 año según el ciclo), editable antes de confirmar.
- Al confirmar: actualiza `Suscripcion.proximoCobro` a la fecha confirmada, y agrega un registro a un nuevo historial de pagos (`Pago`).
- Una nueva página `/dashboard/clientes/[id]` (detalle de cliente): datos de contacto, sus suscripciones, y un timeline vertical de sus pagos (más reciente primero).
- El nombre del cliente en la tabla de `/dashboard/clientes` pasa a ser un link a esa página de detalle.

No incluye:
- Edición desde la página de detalle (se sigue editando desde el modal de la tabla de Clientes/Suscripciones).
- Notificar al cliente del pago o del próximo cobro (eso es el futuro módulo de Notificaciones).
- Deshacer un pago ya confirmado (no hay botón de "borrar" en el historial de pagos por ahora).
- Base de datos real.

## Modelo de datos

```ts
export type Pago = {
  id: string;
  suscripcionId: string;
  clienteId: string;
  servicio: string;
  monto: number;
  fechaPago: string;           // ISO date — hoy, al momento de confirmar
  fechaCobroAnterior: string;  // ISO date — el proximoCobro que tenía antes de confirmar
  fechaProximoCobroNueva: string; // ISO date — la fecha confirmada (sugerida o editada)
};
```

`clienteId`, `servicio` y `monto` quedan "fotografiados" en el momento del pago (no son referencias vivas a `Cliente`/`Suscripcion`), para que el historial no se rompa ni cambie retroactivamente si más adelante se edita o borra esa suscripción o cliente.

## Cálculo de la fecha sugerida

A partir de `Suscripcion.proximoCobro` (la fecha de cobro que se está pagando ahora, no la fecha de hoy) y `Suscripcion.ciclo`:
- `mensual` → + 1 mes
- `trimestral` → + 3 meses
- `anual` → + 1 año

Se calcula con aritmética de fechas nativa de JS (`setMonth`/`setFullYear`); los casos límite de fin de mes (ej. 31 de enero + 1 mes) siguen el comportamiento estándar de `Date` sin normalización especial — aceptable para esta etapa de mockup.

## Flujo "Marcar como pagado"

1. Click en el ícono de check de una fila de la tabla de Suscripciones.
2. Se abre un diálogo: "Confirmar pago de {servicio} de {cliente}", con un campo de fecha pre-cargado con la sugerencia calculada, editable.
3. Botones Cancelar / Confirmar.
4. Al confirmar (con fecha válida, no vacía):
   - Se actualiza la suscripción: `proximoCobro` = fecha confirmada.
   - Se agrega un `Pago` con `fechaPago` = hoy, `fechaCobroAnterior` = el `proximoCobro` que tenía antes de esta operación, `fechaProximoCobroNueva` = la fecha confirmada.

## Página de detalle de cliente (`/dashboard/clientes/[id]`)

- **Datos de contacto**: nombre, empresa, contactId, email (solo lectura).
- **Suscripciones**: lista de las suscripciones de ese cliente (servicio, monto, ciclo, próximo cobro) — solo lectura, mismo formato que la tabla de Suscripciones pero sin acciones.
- **Timeline de pagos**: lista vertical (línea + puntos) de los `Pago` de ese cliente, ordenados de más reciente a más antiguo — servicio, monto, fecha de pago. Si no hay pagos todavía, muestra un estado vacío simple.
- Si el `id` de la URL no corresponde a ningún cliente existente, se muestra un estado "Cliente no encontrado" con un link de vuelta a `/dashboard/clientes`.

## Cambios sobre lo ya construido

- **`components/dashboard/clientes-table.tsx`**: el nombre del cliente pasa de `<span>` a `<Link href={\`/dashboard/clientes/${c.id}\`}>`. Editar/Borrar no cambian.
- Ícono para "Marcar como pagado": `CheckCircledIcon` de `@radix-ui/react-icons`, con acento verde nuevo (ver estilo).

## Persistencia

- Nuevo store `usePagos()` en `lib/pagos-store.ts`, mismo patrón que `useClientes`/`useSuscripciones`: `localStorage` (clave `projectgest:pagos`), estado inicial vacío (`[]`, no hay pagos mock semilla), mismo patrón anti-hidratación, expone `{ pagos, addPago }`.

## Estilo visual

Se agregan tokens de acento verde (éxito) en `app/globals.css`, siguiendo la paleta pastel de `.agents/skills/minimalist-ui/SKILL.md` (`--color-success-bg`, `--color-success-border`, `--color-success-text`), mismo criterio que ya se usó para el rojo de "vencido". El ícono de check y el diálogo de confirmación usan este acento.

## Testing / verificación

Sin test runner. Verificación manual (navegador real):
- Marcar como pagado una suscripción mensual/trimestral/anual y confirmar que la fecha sugerida es correcta en cada caso.
- Editar la fecha sugerida antes de confirmar y verificar que se guarda la editada, no la sugerida.
- Confirmar sin tocar la fecha (usa la sugerida) → `proximoCobro` de la suscripción se actualiza, aparece en la tabla de Suscripciones con la nueva fecha.
- Ir a `/dashboard/clientes/[id]` de ese cliente y verificar que el pago aparece primero en el timeline.
- Ir a una URL de detalle con un id inexistente → se ve el estado "Cliente no encontrado".
- Click en el nombre de un cliente desde la tabla de Clientes → navega correctamente al detalle.
- Cliente sin pagos todavía → timeline muestra el estado vacío.
- Responsive en mobile/desktop, tema claro/oscuro funcionando en el diálogo de confirmación y en la página de detalle.
