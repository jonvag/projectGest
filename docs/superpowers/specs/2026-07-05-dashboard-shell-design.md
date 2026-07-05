# Shell + Dashboard (projectGest)

## Propósito

Primera de cuatro sub-entregas de la interfaz interna de `projectGest` (las otras tres — Clientes, Suscripciones, Historial de Notificaciones — son specs futuros, separados). Esta cubre el layout compartido (sidebar de navegación) y el Dashboard: el tablero principal que el usuario ve al "iniciar sesión", con las métricas clave de cobros.

No hay base de datos todavía. Los datos se generan con un array mock tipado en el código, pensado para ser reemplazado por consultas reales cuando exista persistencia.

## Alcance

Incluye:
- Layout compartido con sidebar izquierdo, con los 4 módulos como links: Dashboard (activo), Clientes, Suscripciones, Notificaciones (estos 3 últimos llevan a una pantalla "Próximamente").
- Ruta `/dashboard` con el tablero: 3 tarjetas de métricas + 2 listas de detalle.
- El botón "Iniciar sesión" de la landing (`components/login-button.tsx`) pasa a navegar a `/dashboard` (sin autenticación real).
- Un array mock de clientes/suscripciones y las funciones puras que derivan las 3 métricas del Dashboard a partir de él.

No incluye (specs futuros separados):
- CRUD real de Clientes.
- Gestor de Suscripciones real (vincular cliente + servicio + monto + ciclo).
- Historial de Notificaciones real (incluida la plantilla de recordatorio).
- Autenticación real.
- Base de datos / persistencia.
- Tests automatizados (decisión explícita: por ahora se verifica con build + revisión manual, igual que la landing; se reconsidera cuando haya persistencia real).

## Modelo de datos mock

```ts
type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  numeroTlf: string;
  email: string;
  servicios: string[];
  monto: number;
  ciclo: "mensual" | "anual";
  proximoCobro: string; // ISO date (YYYY-MM-DD)
};
```

6 a 8 registros de ejemplo, con `proximoCobro` distribuido deliberadamente para que las 3 métricas den resultados no triviales:
- Al menos 2 registros con `proximoCobro` en el pasado (para poblar "Cobros vencidos").
- Al menos 2 registros con `proximoCobro` entre hoy y hoy+7 días (para poblar "Próximos cobros de la semana").
- Al menos 1 registro con `proximoCobro` más adelante en el mes pero fuera de los próximos 7 días (cuenta para "Ingresos esperados este mes" pero no para las otras dos tarjetas).
- Al menos 1 registro con `proximoCobro` el mes que viene (no debe contar en ninguna de las 3 métricas actuales — sirve para verificar que el filtro de mes/semana funciona).

Los campos `nombre`, `numeroTlf` y `servicios` ya cubren las variables de la plantilla de recordatorio (`{{nombre}}`, `{{numero_tlf}}`, `{{lista_de_servicios}}`) que se usará en el futuro spec de Notificaciones — no se implementa el envío ni la plantilla en este spec, solo se deja el modelo de datos compatible.

## Cálculo de métricas (lógica pura)

A partir del array mock, en un módulo separado de las funciones "de UI":
- **Ingresos esperados este mes:** suma de `monto` de los registros cuyo `proximoCobro` cae dentro del mes calendario actual.
- **Cobros vencidos:** registros cuyo `proximoCobro` es anterior a hoy. La tarjeta muestra la cantidad y/o el monto total vencido, en rojo (acento de peligro).
- **Próximos cobros de la semana:** registros cuyo `proximoCobro` está entre hoy (inclusive) y hoy+7 días (inclusive).

"Hoy" se calcula en el momento de renderizar (no hardcodeado), para que el comportamiento sea correcto sin importar cuándo se mire el Dashboard.

## Layout y componentes

- **Sidebar izquierdo** (fijo, alto completo): logo/nombre arriba, luego los 4 links de módulo. Dashboard resaltado como activo cuando la ruta es `/dashboard`. Clientes/Suscripciones/Notificaciones se ven en el sidebar pero con estilo atenuado (no deshabilitados del todo: llevan a una pantalla "Próximamente" compartida, no a un `href="#"` muerto).
- **Área de contenido** a la derecha del sidebar, con el contenido de cada ruta.
- **Dashboard (`/dashboard`):**
  - 3 tarjetas de métrica en fila (responsive: columna en mobile): "Ingresos esperados este mes", "Cobros vencidos" (acento rojo pastel), "Próximos cobros de la semana".
  - Debajo, dos listas de detalle: "Cobros vencidos" y "Próximos cobros", cada fila con cliente, monto y fecha. Si una lista está vacía, muestra un estado vacío simple ("No hay cobros vencidos", etc.).
- **Páginas "Próximamente"** (`/dashboard/clientes`, `/dashboard/suscripciones`, `/dashboard/notificaciones`): mensaje simple reutilizando un mismo componente, sin contenido funcional.

## Archivos

- `app/dashboard/layout.tsx` — arma sidebar + área de contenido.
- `app/dashboard/page.tsx` — tarjetas + listas del Dashboard.
- `app/dashboard/clientes/page.tsx`, `app/dashboard/suscripciones/page.tsx`, `app/dashboard/notificaciones/page.tsx` — cada una renderiza el componente "Próximamente".
- `lib/mock-data.ts` — el array de clientes mock + las 3 funciones de cálculo de métricas.
- `components/dashboard/sidebar.tsx` — nav del shell.
- `components/dashboard/metric-card.tsx` — tarjeta de métrica reutilizable (label, valor, variante `default` | `danger`).
- `components/dashboard/coming-soon.tsx` — placeholder reutilizado por los 3 módulos futuros.
- `components/login-button.tsx` — se modifica: el `onClick` pasa de `console.log` a navegar a `/dashboard` (`useRouter` de `next/navigation`).

## Estilo visual

Sigue el protocolo `minimalist-ui` ya aplicado en la landing, reutilizando las CSS vars existentes (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, tema claro/oscuro). Se agrega un acento de "peligro" para la tarjeta y lista de vencidos, usando la paleta pastel del skill (fondo `#FDEBEC` / texto `#9F2F2D` en claro; equivalentes desaturados en oscuro), no rojo saturado.

## Testing / verificación

Sin test runner por decisión explícita. Verificación manual:
- Build (`npm run build`) sin errores.
- Revisión visual (navegador real): las 3 tarjetas muestran valores coherentes con el array mock, las 2 listas muestran los registros correctos, el sidebar resalta Dashboard como activo y las otras 3 rutas muestran "Próximamente", el botón "Iniciar sesión" de la landing navega a `/dashboard`, responsive en mobile/desktop, tema claro/oscuro sigue funcionando en la nueva sección.
