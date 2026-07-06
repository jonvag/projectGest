# Panel de administración: SUPERUSER crea empresas y accesos de cliente

## Propósito

Tercera sub-entrega de la parte administrativa, después de [2026-07-06-clientes-dueno-empresa-design.md](2026-07-06-clientes-dueno-empresa-design.md). Esa entrega dejó a `SUPERUSER` con la capacidad de crear `Cliente`s para cualquier empresa vía API (pasando `usuarioId` explícito), pero sin ninguna pantalla para hacerlo, y sin forma de crear una empresa nueva salvo por seed/script. Esta entrega cierra ese hueco: una pantalla donde `SUPERUSER` crea usuarios `EMPRESA`, ve los clientes de cada una, y da de alta el acceso de login de un `CLIENTE` a un `Cliente` ya existente.

## Alcance

Incluye:
- `User.nombre` (String, opcional) — nuevo campo, para no mostrar el email crudo en listas.
- Nav item "Empresas" en el sidebar, visible solo para `rol === "SUPERUSER"`.
- `/dashboard/empresas`: lista de empresas (nombre, email, cantidad de clientes) + alta de empresa nueva.
- `/dashboard/empresas/[id]`: detalle de una empresa — sus clientes (con estado de acceso), alta de cliente nuevo para esa empresa, y alta de acceso de login para un cliente existente sin acceso.
- Endpoints nuevos: `GET/POST /api/empresas`, `GET /api/empresas/[id]`, `POST /api/clientes/[id]/acceso`.

No incluye:
- El portal donde el `CLIENTE` inicia sesión y ve sus propias suscripciones/pagos — sub-entrega separada, futura.
- Que la propia `EMPRESA` pueda otorgar accesos `CLIENTE` a sus clientes — solo `SUPERUSER` puede, por ahora.
- Editar, revocar o resetear el acceso de un cliente ya vinculado.
- Editar el `nombre`/email de una empresa ya creada, o borrar una empresa.

## Modelo de datos

```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  nombre           String?
  passwordHash     String
  rol              Rol
  creadoEn         DateTime  @default(now())
  sessions         Session[]
  clientes         Cliente[] @relation("EmpresaClientes")
  clienteVinculado Cliente?  @relation("ClienteLogin")
}
```

Único cambio de schema: `nombre String?` agregado a `User`. `Cliente` no cambia (ya tiene `usuarioId`/`userId` de la entrega anterior).

## API

Todas las rutas nuevas exigen `requireSesion()` y `sesion.rol === "SUPERUSER"` (403 en caso contrario) — esto es exclusivamente superficie de administración.

- **`GET /api/empresas`**: `prisma.user.findMany({ where: { rol: "EMPRESA" }, include: { _count: { select: { clientes: true } } } })`, devuelve `{ id, email, nombre, _count: { clientes } }[]`.
- **`POST /api/empresas`**: body `{ nombre, email, password }`. 400 si falta `email` o `password` (`nombre` es opcional, igual que en el schema). Hashea `password` con `bcrypt` (mismo helper `hashPassword` de `lib/auth.ts`), crea `User` con `rol: "EMPRESA"`. 409 si el email ya existe (P2002).
- **`GET /api/empresas/[id]`**: busca el `User` por id y `rol: "EMPRESA"` (404 si no existe o no es empresa), incluye `clientes: true`. Devuelve `{ id, email, nombre, clientes: Cliente[] }`.
- **`POST /api/clientes/[id]/acceso`**: body `{ email, password }`. Busca el `Cliente` por id (404 si no existe). Si `cliente.userId` ya está seteado, 400 `"Este cliente ya tiene acceso."`. Si no, crea `User` con `rol: "CLIENTE"`, `nombre: cliente.nombre` (copiado del cliente, editable después si hiciera falta — fuera de alcance ahora), hashea `password`, y en la misma operación actualiza `cliente.userId` al nuevo user (usar `prisma.$transaction` para que la creación del `User` y el `update` del `Cliente` sean atómicos). 409 si el email ya existe.

## UI

- **`components/dashboard/sidebar.tsx`**: pasa a recibir `rol: Rol` como prop. `NAV_ITEMS` se arma condicionalmente: el item `{ href: "/dashboard/empresas", label: "Empresas", available: true }` solo se agrega si `rol === "SUPERUSER"`.
- **`app/dashboard/layout.tsx`**: le pasa `sesion.rol` a `<Sidebar rol={sesion.rol} />` (ya es server component con la sesión disponible, sin cambios de arquitectura).
- **`app/dashboard/empresas/page.tsx`**: tabla (nombre o email si no hay nombre, email, cantidad de clientes), fila clickeable a `/dashboard/empresas/[id]`. Botón "Nueva empresa" abre `EmpresaFormModal`.
- **`components/dashboard/empresa-form-modal.tsx`**: modal con `nombre` (opcional), `email`, `password` → `POST /api/empresas`.
- **`app/dashboard/empresas/[id]/page.tsx`**: header con nombre/email de la empresa, tabla de sus clientes vía `EmpresaClientesTable`, botón "Nuevo cliente" que abre `ClienteFormModal` con `usuarioIdFijo` seteado al id de esta empresa.
- **`components/dashboard/empresa-clientes-table.tsx`**: tabla nueva y separada de `ClientesTable` (esta vista necesita la columna/acción de "acceso" que la tabla de la propia empresa no necesita — mezclar ambas conceptualmente distintas responsabilidades en un solo componente sería confuso). Columnas: nombre, empresa (del cliente), contacto, email, acceso ("Con acceso" si `userId` no es null, si no botón "Crear acceso"). Reutiliza los mismos handlers de editar/borrar cliente que ya existen (`PUT`/`DELETE /api/clientes/[id]`, que ya soportan `SUPERUSER` desde la entrega anterior).
- **`components/dashboard/crear-acceso-modal.tsx`**: modal con `email`, `password` → `POST /api/clientes/[id]/acceso`.
- **`components/dashboard/cliente-form-modal.tsx`**: se agrega una prop opcional `usuarioIdFijo?: string`. Cuando está presente, el `guardar` del padre debe incluir `usuarioId: usuarioIdFijo` en el body del POST (el modal en sí no necesita un campo de UI para elegir empresa — se fija por contexto de qué página lo abre).

## Testing / verificación

Sin test runner. Verificación manual con `curl` + navegador:
- Login como EMPRESA (`empresa@demo.com`) → no ve el item "Empresas" en el sidebar; `GET /api/empresas` → 403.
- Login como SUPERUSER → ve "Empresas", `GET /api/empresas` devuelve al menos `empresa@demo.com` con `_count.clientes` = 6 (o el número real sembrado).
- `POST /api/empresas` con email repetido → 409.
- Entrar al detalle de `empresa@demo.com`, crear un cliente nuevo desde ahí → aparece en `GET /api/clientes` como propiedad de esa empresa (verificado en la entrega anterior que el `usuarioId` se respeta).
- Sobre un cliente sin acceso, "Crear acceso" con email/password → el cliente pasa a mostrar "Con acceso"; login con esas credenciales nuevas via `/api/auth/login` responde `{"ok":true,"rol":"CLIENTE"}`.
- Intentar "Crear acceso" dos veces sobre el mismo cliente → 400 la segunda vez.
