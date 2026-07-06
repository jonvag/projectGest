# Clientes con dueño (empresa) y cuenta de cliente opcional

## Propósito

Segunda sub-entrega de la parte administrativa (después de [2026-07-06-auth-login-design.md](2026-07-06-auth-login-design.md)). Esa entrega dejó el modelo `Rol` existiendo como campo sin uso real: cualquier sesión válida ve y crea todos los `Cliente`/`Suscripcion`/`Pago`, sin distinción de dueño. Esta entrega resuelve eso: cada `Cliente` pasa a tener un dueño (`User` con rol `EMPRESA`), y las rutas existentes empiezan a filtrar según el rol de la sesión.

Es el fundamento que habilita, en entregas siguientes: pantalla de administración para que `SUPERUSER` cree usuarios `EMPRESA`/`CLIENTE`, portal de login para `CLIENTE`, y la tabla de `Notificacion` (WhatsApp vía n8n) — todas dependen de que exista un dueño real por cliente.

## Alcance

Incluye:
- `Cliente` pasa a tener `usuarioId` (obligatorio, la empresa dueña) y `userId` (opcional, único — cuenta de login del cliente, sin usarse todavía).
- Reset y reseed completo de la base de datos: no se preserva la data actual (6 clientes/8 suscripciones ya sembrados no tienen dueño real hoy).
- Seed actualizado: `jon.apiscope.empresa@gmail.com` se mantiene `SUPERUSER` sin clientes propios; se crea un usuario nuevo `empresa@demo.com` con rol `EMPRESA`, dueño de los 6 clientes sembrados.
- Helper `filtroClientePorSesion(sesion)` en `lib/auth.ts` que devuelve el `where` de Prisma correcto según rol.
- `GET/POST /api/clientes` y `GET/PATCH/DELETE /api/clientes/[id]` filtran y validan dueño según el rol de la sesión.
- `GET/POST /api/suscripciones`, `GET/PATCH/DELETE /api/suscripciones/[id]` y `POST /api/pagos` filtran transitivamente vía el `Cliente` relacionado.

No incluye:
- Pantalla de UI para que `SUPERUSER` cree usuarios `EMPRESA`/`CLIENTE` (API se prueba con seed/`curl` por ahora; la pantalla es la siguiente sub-entrega).
- Login real para `CLIENTE` (`Cliente.userId` queda siempre `null` en esta entrega).
- Tabla `Notificacion` / integración con n8n (depende de esta entrega, pero es una sub-entrega aparte).
- Vista especial para que `SUPERUSER` navegue "por empresa" (ve todo sin filtro por ahora; una UI de navegación por empresa queda para después).

## Modelo de datos

```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  passwordHash     String
  rol              Rol
  creadoEn         DateTime  @default(now())
  sessions         Session[]
  clientes         Cliente[] @relation("EmpresaClientes")
  clienteVinculado Cliente?  @relation("ClienteLogin")
}

model Cliente {
  id            String        @id @default(uuid())
  usuarioId     String
  usuario       User          @relation("EmpresaClientes", fields: [usuarioId], references: [id], onDelete: Restrict)
  userId        String?       @unique
  user          User?         @relation("ClienteLogin", fields: [userId], references: [id], onDelete: SetNull)
  nombre        String
  empresa       String
  contactId     String
  email         String        @unique
  creadoEn      DateTime      @default(now())
  suscripciones Suscripcion[]
}
```

`usuarioId` usa `onDelete: Restrict` (igual que `Suscripcion.clienteId` hoy): no se puede borrar una empresa que todavía tiene clientes. `userId` usa `onDelete: SetNull`: si se borra la cuenta de login de un cliente, el `Cliente` no desaparece, solo pierde el vínculo de acceso.

`Suscripcion` y `Pago` no cambian de esquema — su dueño se resuelve transitivamente vía `Cliente.usuarioId`.

## Migración y seed

- `npx prisma migrate reset` (desarrollo, sin datos que conservar) en vez de una migración con backfill en dos pasos.
- `prisma/seed.ts` agrega, antes de crear los 6 clientes:
  ```ts
  const empresaDemo = await prisma.user.create({
    data: {
      email: "empresa@demo.com",
      passwordHash: await bcrypt.hash("<clave-generada>", 10),
      rol: "EMPRESA",
    },
  });
  ```
  y cada `prisma.cliente.create` existente agrega `usuarioId: empresaDemo.id`.
- El `User` `SUPERUSER` (`jon.apiscope.empresa@gmail.com`) se crea igual que hoy, sin cambios.

## Scoping por rol

Helper nuevo en `lib/auth.ts`:

```ts
import type { Prisma } from "@prisma/client";

export function filtroClientePorSesion(sesion: SesionActual): Prisma.ClienteWhereInput {
  if (sesion.rol === "SUPERUSER") return {};
  if (sesion.rol === "EMPRESA") return { usuarioId: sesion.id };
  return { userId: sesion.id }; // CLIENTE
}
```

- **`GET /api/clientes`**: agrega `where: filtroClientePorSesion(sesion)`.
- **`POST /api/clientes`**:
  - `rol === "CLIENTE"` → `403` (un cliente no crea clientes).
  - `rol === "EMPRESA"` → fuerza `usuarioId: sesion.id`, ignora cualquier `usuarioId` recibido en el body.
  - `rol === "SUPERUSER"` → exige `usuarioId` explícito en el body (`400` si falta); no hay owner por default para evitar clientes sin dueño real.
- **`GET/PATCH/DELETE /api/clientes/[id]`**: busca el cliente por id, valida que cumpla `filtroClientePorSesion(sesion)`; si no, responde `404` (no `403`, para no revelar que el recurso existe).
- **`/api/suscripciones`, `/api/suscripciones/[id]`, `/api/pagos`**: no tienen `usuarioId` propio. Filtran/validan vía el `Cliente` relacionado:
  - Lecturas: `where: { cliente: filtroClientePorSesion(sesion) }`.
  - Escrituras (`POST` con `clienteId` en el body): antes de crear, `prisma.cliente.findFirst({ where: { id: clienteId, ...filtroClientePorSesion(sesion) } })` — si no aparece, `404`.

## Cambios sobre lo ya construido

- `prisma/schema.prisma`: campos y relaciones descritos arriba.
- `prisma/seed.ts`: usuario `empresa@demo.com` y `usuarioId` en los 6 clientes sembrados.
- `lib/auth.ts`: nuevo helper `filtroClientePorSesion`.
- `app/api/clientes/route.ts`, `app/api/clientes/[id]/route.ts`: scoping descrito arriba.
- `app/api/suscripciones/route.ts`, `app/api/suscripciones/[id]/route.ts`, `app/api/pagos/route.ts`: scoping descrito arriba.

## Testing / verificación

Sin test runner, verificación manual con `curl` contra `next dev` y la base reseedeada:

- Login como `empresa@demo.com` → `GET /api/clientes` devuelve exactamente los 6 clientes sembrados.
- Login como `jon.apiscope.empresa@gmail.com` (`SUPERUSER`) → `GET /api/clientes` devuelve los mismos 6 (ve todo, sin filtro).
- `SUPERUSER` hace `POST /api/clientes` sin `usuarioId` en el body → `400`.
- `SUPERUSER` hace `POST /api/clientes` con `usuarioId` de `empresa@demo.com` → `201`, el cliente creado queda con ese dueño.
- Se crea a mano un segundo `User` `EMPRESA` (`otra-empresa@demo.com`) y un `Cliente` propio para probar aislamiento.
- Login como `empresa@demo.com`, `POST /api/clientes` mandando `usuarioId` de `otra-empresa@demo.com` en el body → el cliente creado queda igual con `usuarioId` de `empresa@demo.com` (se ignoró el valor recibido).
- Login como `empresa@demo.com`, `GET /api/clientes/[id]` de un cliente de `otra-empresa@demo.com` → `404`.
- Login como `empresa@demo.com` → `GET /api/suscripciones` solo trae suscripciones de sus propios clientes, no las de `otra-empresa@demo.com`.