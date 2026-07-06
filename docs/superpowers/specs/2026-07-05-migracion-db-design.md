# Migración de localStorage a PostgreSQL (Prisma)

## Propósito

Reemplaza la persistencia mock en `localStorage` (Clientes, Suscripciones, Pagos) por una base de datos PostgreSQL real, usando Prisma como ORM, sin tocar el diseño visual ni la lógica de negocio ya construida (cálculo de métricas, cálculo de próxima fecha, validaciones).

## Contexto de la base

`DATABASE_URL` apunta a una base (`talento_activo`) que ya usa otro proyecto del usuario (tablas `Account`, `Session`, `User`, `Video`, etc. en el schema `public`, gestionadas con su propio Prisma). Verificado por inspección directa (solo lectura) antes de este spec — no existe todavía ningún schema `projectgest`.

**Aislamiento:** este proyecto usa su propia `DATABASE_URL` con `?schema=projectgest` al final. Prisma crea y gestiona el schema `projectgest` (tablas + su propia `_prisma_migrations`) de forma completamente separada del schema `public` del otro proyecto — no se usa la feature `multiSchema` de Prisma porque no hace falta cruzar datos entre proyectos.

## Alcance

Incluye:
- Instalar y configurar Prisma (`prisma`, `@prisma/client`), con el schema `projectgest` aislado.
- Definir 3 modelos: `Cliente`, `Suscripcion`, `Pago` — misma forma que los tipos TypeScript ya existentes.
- Migración inicial (`prisma migrate dev`) que crea el schema y las tablas.
- Script de seed que carga los mismos 6 clientes / 8 suscripciones mock que ya usa el código (arranque desde cero, no se migran datos de `localStorage` existentes — decisión explícita).
- 3 grupos de API routes (`/api/clientes`, `/api/suscripciones`, `/api/pagos`) con los métodos necesarios para cubrir lo que hoy hacen los hooks (`GET`, `POST`, `PUT`/`PATCH`, `DELETE`).
- Reescribir `useClientes`, `useSuscripciones`, `usePagos` para que hagan `fetch` a esas rutas en vez de leer/escribir `localStorage`, manteniendo la misma forma de retorno (mismos nombres de campos y funciones) para no tener que tocar los componentes que ya los consumen.

No incluye:
- Cambios visuales o de UX en ninguna pantalla.
- Cambios en las reglas de negocio ya definidas (bloqueo de borrado, validaciones, cálculo de fechas).
- Autenticación real (sigue sin haber login funcional).
- Migrar datos existentes de `localStorage` a la base (decisión explícita: se arranca con el seed mock).
- Tocar cualquier tabla o dato del schema `public` / del otro proyecto.

## Modelo de datos (Prisma)

```prisma
enum CicloCobro {
  mensual
  trimestral
  anual
}

model Cliente {
  id            String        @id @default(uuid())
  nombre        String
  empresa       String
  contactId     String
  email         String        @unique
  creadoEn      DateTime      @default(now())
  suscripciones Suscripcion[]
}

model Suscripcion {
  id            String     @id @default(uuid())
  clienteId     String
  cliente       Cliente    @relation(fields: [clienteId], references: [id], onDelete: Restrict)
  servicio      String
  monto         Float
  ciclo         CicloCobro
  proximoCobro  DateTime   @db.Date
  creadoEn      DateTime   @default(now())
}

model Pago {
  id                   String   @id @default(uuid())
  suscripcionId        String
  clienteId            String
  servicio             String
  monto                Float
  fechaPago            DateTime @db.Date
  fechaCobroAnterior   DateTime @db.Date
  fechaProximoCobroNueva DateTime @db.Date
  creadoEn             DateTime @default(now())
}
```

Notas de diseño:
- `Suscripcion.clienteId` **sí** es una relación normal de Prisma hacia `Cliente`, con `onDelete: Restrict` explícito — replica a nivel de base el bloqueo que ya existe en el código (no se puede borrar un cliente con suscripciones).
- `Pago.suscripcionId` y `Pago.clienteId` son **strings sueltos, sin relación FK** — a propósito: `Pago` es un log histórico "fotografiado" (ya tiene su propio `servicio`/`monto` copiados), y no debe bloquearse ni romperse si más adelante se borra la suscripción o el cliente que lo originó.
- `monto` es `Float` (no `Decimal`) para no tener que convertir con `.toNumber()` en toda la app — coherente con que hoy es `number` en TypeScript. Los montos de este proyecto son simples (sin necesidad de precisión bancaria).
- Fechas (`proximoCobro`, `fechaPago`, etc.) se guardan como `DateTime @db.Date` (sin hora) en la base, pero las API routes las serializan a `"YYYY-MM-DD"` en el JSON de respuesta/request — así toda la lógica de fechas ya escrita (comparaciones de string ISO) sigue funcionando sin cambios.

## Arquitectura

- **Conexión:** `.env` ya tiene `DATABASE_URL`; se le agrega `?schema=projectgest` al final.
- **Cliente Prisma:** `lib/prisma.ts`, patrón singleton estándar de Next.js (evita crear múltiples instancias en desarrollo con hot-reload).
- **Restricción de borrado a nivel de base:** la relación `Suscripcion.cliente` declara `onDelete: Restrict` explícitamente, así que después de `prisma migrate dev` se verifica que borrar un `Cliente` con `Suscripcion`es asociadas falle también a nivel de base — red de seguridad adicional a la validación que ya existe en el código.
- **API routes** (`app/api/.../route.ts`, Route Handlers de Next.js App Router):
  - `GET /api/clientes`, `POST /api/clientes`
  - `PUT /api/clientes/[id]`, `DELETE /api/clientes/[id]`
  - `GET /api/suscripciones`, `POST /api/suscripciones`
  - `PUT /api/suscripciones/[id]`, `DELETE /api/suscripciones/[id]`
  - `GET /api/pagos`, `POST /api/pagos`
  - Cada ruta valida lo mismo que hoy validan los hooks (email único, campos requeridos) del lado del servidor — no confiar solo en la validación del formulario del cliente.
  - `DELETE /api/clientes/[id]` devuelve un error controlado (no un 500) si Prisma rechaza el borrado por la FK, con el mismo mensaje que ya usa la UI.
- **Hooks:** `useClientes`, `useSuscripciones`, `usePagos` pasan de `localStorage` a `fetch`:
  - Cargan los datos con `useEffect` al montar (`GET`).
  - Cada mutación (`addCliente`, `updateCliente`, etc.) hace el `fetch` correspondiente y actualiza el estado local con la respuesta del servidor (no con un cálculo optimista) para que la UI siempre refleje lo que realmente quedó guardado.
  - Los nombres de campos y funciones de cada hook no cambian (`clientes`, `addCliente`, `updateCliente`, etc.), pero las funciones de mutación pasan a ser `async` (devuelven `Promise`, ya que ahora hacen una llamada de red real). Esto implica un cambio mecánico —no de diseño— en los componentes que las llaman: agregar `async`/`await` donde hoy llaman a la función de forma síncrona, y que los modales esperen la respuesta antes de cerrarse (para poder mostrar un error del servidor, como el email duplicado, antes de cerrar).
  - Ya no hay "estado inicial = mock" ni patrón anti-hidratación: al ser datos remotos, el estado inicial es `[]`/`cargando`, y el primer render (servidor y cliente) coincide en mostrar "cargando" — esto reemplaza al patrón anterior, no lo mantiene.

## Testing / verificación

Sin test runner. Verificación manual:
- `prisma migrate dev` corre sin tocar ninguna tabla de `public`.
- El seed carga los 6 clientes / 8 suscripciones esperadas.
- Los 3 módulos (Dashboard, Clientes, Suscripciones + marcar pagado + detalle de cliente) funcionan igual que con `localStorage`, pero los datos sobreviven un restart del servidor de Next.js (no solo un reload del navegador).
- Borrar un cliente con suscripciones falla igual que antes (ahora también protegido por la base).
- Verificar en `psql`/`docker exec` que las tablas quedaron en el schema `projectgest` y que `public` no cambió.
