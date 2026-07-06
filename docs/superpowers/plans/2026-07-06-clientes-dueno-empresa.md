# Clientes con dueño (empresa) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada `Cliente` pasa a tener un dueño real (`User` con rol `EMPRESA`), y las rutas de `clientes`, `suscripciones` y `pagos` filtran/validan según el rol de la sesión en vez de exponer todo a cualquier sesión válida.

**Architecture:** Se agregan `Cliente.usuarioId` (obligatorio) y `Cliente.userId` (opcional, sin uso todavía) al schema de Prisma. Un helper único `filtroClientePorSesion` en `lib/auth.ts` centraliza la regla de scoping por rol; cada ruta lo usa para filtrar lecturas y validar dueño en escrituras. `Suscripcion` tiene relación Prisma a `Cliente` (se filtra anidado); `Pago` no tiene relación declarada a `Cliente` (solo `clienteId` suelto), así que se filtra por lista de ids.

**Tech Stack:** Next.js 16 (App Router, API routes), Prisma 6 + PostgreSQL, bcryptjs, sin test runner (verificación manual con `curl` y Prisma Studio).

## Global Constraints

- No preservar datos actuales: `npx prisma migrate reset --force` está autorizado en este plan (confirmado por el usuario).
- Nombres exactos: relación `usuario`/`clientes` (`@relation("EmpresaClientes")`) y `user`/`clienteVinculado` (`@relation("ClienteLogin")`) — deben coincidir en ambos lados de cada relación.
- `SUPERUSER` nunca es dueño de clientes; siempre debe pasar `usuarioId` explícito al crear un `Cliente`.
- Sin test runner: cada tarea se verifica con `curl` contra `next dev` (con cookies de sesión reales) o con Prisma Studio, no con `pytest`/`jest`.

---

### Task 1: Schema, migración y seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: campo `Cliente.usuarioId: string` (obligatorio) y `Cliente.userId: string | null` en el `PrismaClient` generado — usados por las Tasks 2-4.
- Produces: usuario seed `empresa@demo.com` (rol `EMPRESA`), dueño de los 6 clientes sembrados — usado como cuenta de prueba en las Tasks 2-4.

- [ ] **Step 1: Editar el schema de Prisma**

En `prisma/schema.prisma`, reemplazar el modelo `User` y el modelo `Cliente`:

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

El resto del archivo (`CicloCobro`, `Suscripcion`, `Pago`, `Rol`, `Session`) queda igual.

- [ ] **Step 2: Editar el seed para crear la empresa demo y asignar dueño**

En `prisma/seed.ts`, agregar la creación de la empresa demo **antes** de los `prisma.cliente.create`, y agregar `usuarioId: empresaDemo.id` a cada uno de los 6 `prisma.cliente.create` existentes:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHashEmpresaDemo = await bcrypt.hash("DemoEmpresa123!", 10);
  const empresaDemo = await prisma.user.create({
    data: {
      email: "empresa@demo.com",
      passwordHash: passwordHashEmpresaDemo,
      rol: "EMPRESA",
    },
  });
  console.log("Empresa demo sembrada: empresa@demo.com / DemoEmpresa123!");

  const ana = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Ana Torres",
      empresa: "Torres Diseño",
      contactId: "+54 11 5555-0101",
      email: "ana@torresdiseno.com",
    },
  });
  const bruno = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Bruno Cabrera",
      empresa: "Cabrera Software",
      contactId: "+54 11 5555-0102",
      email: "bruno@cabrerasoftware.com",
    },
  });
  const carla = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Carla Núñez",
      empresa: "Núñez Studio",
      contactId: "+54 11 5555-0103",
      email: "carla@nunezstudio.com",
    },
  });
  const diego = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Diego Fernández",
      empresa: "Fernández Web",
      contactId: "+54 11 5555-0104",
      email: "diego@fernandezweb.com",
    },
  });
  const elena = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Elena Ríos",
      empresa: "Ríos Consulting",
      contactId: "+54 11 5555-0105",
      email: "elena@riosconsulting.com",
    },
  });
  const franco = await prisma.cliente.create({
    data: {
      usuarioId: empresaDemo.id,
      nombre: "Franco Ibáñez",
      empresa: "Ibáñez Corp",
      contactId: "+54 11 5555-0106",
      email: "franco@ibanezcorp.com",
    },
  });

  await prisma.suscripcion.createMany({
    data: [
      {
        clienteId: ana.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-10),
      },
      {
        clienteId: bruno.id,
        servicio: "Mantenimiento mensual",
        monto: 150,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(-3),
      },
      {
        clienteId: bruno.id,
        servicio: "Hosting",
        monto: 80,
        ciclo: "anual",
        proximoCobro: isoDateOffset(25),
      },
      {
        clienteId: carla.id,
        servicio: "App móvil",
        monto: 500,
        ciclo: "anual",
        proximoCobro: isoDateOffset(2),
      },
      {
        clienteId: diego.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: diego.id,
        servicio: "SEO",
        monto: 20,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(5),
      },
      {
        clienteId: elena.id,
        servicio: "Mantenimiento mensual",
        monto: 90,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(20),
      },
      {
        clienteId: franco.id,
        servicio: "Página web",
        monto: 100,
        ciclo: "mensual",
        proximoCobro: isoDateOffset(40),
      },
    ],
  });

  const passwordHashSuperuser = await bcrypt.hash("wqrxOCAco1pP", 10);
  await prisma.user.upsert({
    where: { email: "jon.apiscope.empresa@gmail.com" },
    update: {},
    create: {
      email: "jon.apiscope.empresa@gmail.com",
      passwordHash: passwordHashSuperuser,
      rol: "SUPERUSER",
    },
  });
  console.log("Superuser sembrado: jon.apiscope.empresa@gmail.com");

  console.log("Seed completo: 1 empresa, 6 clientes, 8 suscripciones.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Resetear la base y generar la migración**

Run:
```bash
npx prisma migrate reset --force
```
Expected: aplica las migraciones existentes (`20260705153231_init`, `20260706153928_auth`) contra una base vacía. Como el schema todavía no tiene la migración de `usuarioId`/`userId`, este paso solo limpia datos viejos sin dueño.

Run:
```bash
npx prisma migrate dev --name dueno_empresa_cliente
```
Expected: como la tabla `Cliente` está vacía, Prisma agrega la columna `usuarioId` (NOT NULL) sin pedir un valor por default ni advertir pérdida de datos. Al terminar, corre el seed automáticamente y el output final incluye:
```
Empresa demo sembrada: empresa@demo.com / DemoEmpresa123!
Superuser sembrado: jon.apiscope.empresa@gmail.com
Seed completo: 1 empresa, 6 clientes, 8 suscripciones.
```

- [ ] **Step 4: Verificar con Prisma Studio**

Run:
```bash
npx prisma studio
```
En el navegador: tabla `User` tiene 2 filas (`jon.apiscope.empresa@gmail.com` rol `SUPERUSER`, `empresa@demo.com` rol `EMPRESA`). Tabla `Cliente` tiene 6 filas, todas con `usuarioId` igual al id de `empresa@demo.com` y `userId` en blanco/null. Cerrar Prisma Studio (Ctrl+C) al terminar de verificar.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations
git commit -m "feat: Cliente pasa a tener dueño (empresa) y cuenta de login opcional"
```

---

### Task 2: Scoping de `/api/clientes`

**Files:**
- Modify: `lib/auth.ts`
- Modify: `app/api/clientes/route.ts`
- Modify: `app/api/clientes/[id]/route.ts`

**Interfaces:**
- Consumes: `SesionActual` (de `lib/auth.ts`, ya existente: `{ id: string; email: string; rol: Rol }`).
- Produces: `filtroClientePorSesion(sesion: SesionActual): Prisma.ClienteWhereInput` — usado también en Tasks 3 y 4.

- [ ] **Step 1: Agregar el helper de scoping**

En `lib/auth.ts`, agregar el import de `Prisma` y la función al final del archivo:

```ts
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Prisma, Rol } from "@prisma/client";
import { NOMBRE_COOKIE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
```

(agrega `Prisma` al import ya existente de `type { Rol }`)

```ts
export function filtroClientePorSesion(sesion: SesionActual): Prisma.ClienteWhereInput {
  if (sesion.rol === "SUPERUSER") return {};
  if (sesion.rol === "EMPRESA") return { usuarioId: sesion.id };
  return { userId: sesion.id };
}
```

- [ ] **Step 2: Scoping en `GET`/`POST /api/clientes`**

Reemplazar el contenido de `app/api/clientes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const clientes = await prisma.cliente.findMany({
    where: filtroClientePorSesion(sesion),
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (sesion.rol === "CLIENTE") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const datos = await request.json();

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  let usuarioId: string;
  if (sesion.rol === "EMPRESA") {
    usuarioId = sesion.id;
  } else {
    if (!datos.usuarioId) {
      return NextResponse.json(
        { error: "Como superuser, tenés que indicar a qué empresa pertenece el cliente." },
        { status: 400 },
      );
    }
    usuarioId = datos.usuarioId;
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        usuarioId,
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}
```

- [ ] **Step 3: Scoping en `PUT`/`DELETE /api/clientes/[id]`**

Reemplazar el contenido de `app/api/clientes/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientePorSesion(sesion) },
  });
  if (!clienteExistente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const datos = await request.json();

  if (!datos.nombre || !datos.empresa || !datos.contactId || !datos.email) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        empresa: datos.empresa,
        contactId: datos.contactId,
        email: datos.email,
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese email." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientePorSesion(sesion) },
  });
  if (!clienteExistente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  try {
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      const suscripcionesAsociadas = await prisma.suscripcion.count({ where: { clienteId: id } });
      return NextResponse.json(
        { error: "No se puede borrar: tiene suscripciones asociadas.", suscripcionesAsociadas },
        { status: 409 },
      );
    }
    throw error;
  }
}
```

- [ ] **Step 4: Verificación manual con `curl`**

Con `next dev` corriendo (`npm run dev`) y la base ya sembrada (Task 1):

```bash
# Login como empresa demo, guardando cookies
curl -c /tmp/empresa.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"empresa@demo.com","password":"DemoEmpresa123!"}'

# Login como superuser
curl -c /tmp/superuser.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jon.apiscope.empresa@gmail.com","password":"wqrxOCAco1pP"}'
```
Expected: el primero responde `200` con `{"ok":true,"rol":"EMPRESA"}`, el segundo con `{"ok":true,"rol":"SUPERUSER"}`; ambos guardan cookie de sesión en su archivo.

```bash
curl -b /tmp/empresa.txt http://localhost:3000/api/clientes | python3 -m json.tool | grep -c '"id"'
```
Expected: `6`.

```bash
curl -b /tmp/superuser.txt http://localhost:3000/api/clientes | python3 -m json.tool | grep -c '"id"'
```
Expected: `6` (superuser ve todo, sin filtro).

```bash
curl -b /tmp/superuser.txt -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test Sin Empresa","empresa":"X","contactId":"+54 11 0000-0000","email":"testsinempresa@x.com"}'
```
Expected: `400` con `{"error":"Como superuser, tenés que indicar a qué empresa pertenece el cliente."}`.

```bash
EMPRESA_ID=$(curl -b /tmp/empresa.txt http://localhost:3000/api/clientes | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['usuarioId'])")

curl -b /tmp/superuser.txt -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Test Con Empresa\",\"empresa\":\"X\",\"contactId\":\"+54 11 0000-0000\",\"email\":\"testconempresa@x.com\",\"usuarioId\":\"$EMPRESA_ID\"}"
```
Expected: `201`, el cliente creado tiene `"usuarioId"` igual a `$EMPRESA_ID`.

```bash
curl -b /tmp/empresa.txt http://localhost:3000/api/clientes/id-de-un-cliente-que-no-existe-o-de-otra-empresa
```
Expected: `404` con `{"error":"Cliente no encontrado."}` (probar con un id real de otra empresa una vez exista — ver Task 3/4 no cubre esto; alcanza con probar un id inventado como UUID válido pero inexistente para confirmar el `404`).

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts app/api/clientes
git commit -m "feat: filtrar y validar dueño en /api/clientes según rol de sesión"
```

---

### Task 3: Scoping de `/api/suscripciones`

**Files:**
- Modify: `app/api/suscripciones/route.ts`
- Modify: `app/api/suscripciones/[id]/route.ts`

**Interfaces:**
- Consumes: `filtroClientePorSesion` (Task 2, `lib/auth.ts`).

- [ ] **Step 1: Scoping en `GET`/`POST /api/suscripciones`**

Reemplazar el contenido de `app/api/suscripciones/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const suscripciones = await prisma.suscripcion.findMany({
    where: { cliente: filtroClientePorSesion(sesion) },
    orderBy: { creadoEn: "asc" },
  });
  return NextResponse.json(suscripciones.map(serializeSuscripcion));
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const datos = await request.json();

  if (
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    datos.monto <= 0 ||
    !datos.ciclo ||
    !datos.proximoCobro
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const clientePermitido = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, ...filtroClientePorSesion(sesion) },
  });
  if (!clientePermitido) {
    return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.create({
    data: {
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      ciclo: datos.ciclo,
      proximoCobro: parseFechaDb(datos.proximoCobro),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion), { status: 201 });
}
```

Nota: como ahora se valida `clienteId` antes del `create`, el catch de `P2003` ("El cliente seleccionado no existe") ya no puede dispararse por ese motivo — se quita el `try/catch`, ya que no queda otro error esperado que capturar ahí.

- [ ] **Step 2: Scoping en `PUT`/`DELETE /api/suscripciones/[id]`**

Reemplazar el contenido de `app/api/suscripciones/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializeSuscripcion } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const suscripcionExistente = await prisma.suscripcion.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!suscripcionExistente) {
    return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  }

  const datos = await request.json();

  if (
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    datos.monto <= 0 ||
    !datos.ciclo ||
    !datos.proximoCobro
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const clientePermitido = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, ...filtroClientePorSesion(sesion) },
  });
  if (!clientePermitido) {
    return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.update({
    where: { id },
    data: {
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      ciclo: datos.ciclo,
      proximoCobro: parseFechaDb(datos.proximoCobro),
    },
  });
  return NextResponse.json(serializeSuscripcion(suscripcion));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const suscripcionExistente = await prisma.suscripcion.findFirst({
    where: { id, cliente: filtroClientePorSesion(sesion) },
  });
  if (!suscripcionExistente) {
    return NextResponse.json({ error: "Suscripción no encontrada." }, { status: 404 });
  }

  await prisma.suscripcion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificación manual con `curl`**

Reutilizando las cookies guardadas en Task 2 (`/tmp/empresa.txt`, `/tmp/superuser.txt`):

```bash
curl -b /tmp/empresa.txt http://localhost:3000/api/suscripciones | python3 -m json.tool | grep -c '"id"'
```
Expected: `8` (las 8 suscripciones sembradas, todas de clientes de `empresa@demo.com`).

```bash
curl -b /tmp/superuser.txt http://localhost:3000/api/suscripciones | python3 -m json.tool | grep -c '"id"'
```
Expected: `8` o más (ve todo, incluye cualquier suscripción de prueba creada en otras tareas).

```bash
curl -b /tmp/empresa.txt -X POST http://localhost:3000/api/suscripciones \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"id-inventado-o-de-otra-empresa","servicio":"Test","monto":10,"ciclo":"mensual","proximoCobro":"2026-08-01"}'
```
Expected: `400` con `{"error":"El cliente seleccionado no existe."}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/suscripciones
git commit -m "feat: filtrar y validar dueño en /api/suscripciones según rol de sesión"
```

---

### Task 4: Scoping de `/api/pagos`

**Files:**
- Modify: `app/api/pagos/route.ts`

**Interfaces:**
- Consumes: `filtroClientePorSesion` (Task 2, `lib/auth.ts`).

Nota: `Pago` no tiene relación Prisma declarada hacia `Cliente` (solo `clienteId: String` suelto), a diferencia de `Suscripcion`. No se puede usar `where: { cliente: filtroClientePorSesion(sesion) }` acá — para `SUPERUSER` no hace falta filtrar; para `EMPRESA`/`CLIENTE` se resuelve primero la lista de ids de clientes permitidos y se filtra `pago.clienteId` contra esa lista.

- [ ] **Step 1: Scoping en `GET`/`POST /api/pagos`**

Reemplazar el contenido de `app/api/pagos/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseFechaDb, serializePago } from "@/lib/api-serializers";
import { filtroClientePorSesion, requireSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const where: { clienteId?: { in: string[] } } = {};
  if (sesion.rol !== "SUPERUSER") {
    const clientesPermitidos = await prisma.cliente.findMany({
      where: filtroClientePorSesion(sesion),
      select: { id: true },
    });
    where.clienteId = { in: clientesPermitidos.map((c) => c.id) };
  }

  const pagos = await prisma.pago.findMany({ where, orderBy: { creadoEn: "asc" } });
  return NextResponse.json(pagos.map(serializePago));
}

export async function POST(request: Request) {
  const sesion = await requireSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const datos = await request.json();

  if (
    !datos.suscripcionId ||
    !datos.clienteId ||
    !datos.servicio ||
    !datos.monto ||
    !datos.fechaPago ||
    !datos.fechaCobroAnterior ||
    !datos.fechaProximoCobroNueva
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const clientePermitido = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, ...filtroClientePorSesion(sesion) },
  });
  if (!clientePermitido) {
    return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 400 });
  }

  const pago = await prisma.pago.create({
    data: {
      suscripcionId: datos.suscripcionId,
      clienteId: datos.clienteId,
      servicio: datos.servicio,
      monto: datos.monto,
      fechaPago: parseFechaDb(datos.fechaPago),
      fechaCobroAnterior: parseFechaDb(datos.fechaCobroAnterior),
      fechaProximoCobroNueva: parseFechaDb(datos.fechaProximoCobroNueva),
    },
  });
  return NextResponse.json(serializePago(pago), { status: 201 });
}
```

- [ ] **Step 2: Verificación manual con `curl`**

Primero generar un pago real para tener datos que consultar (usando una suscripción existente de `empresa@demo.com` — sustituir `SUSCRIPCION_ID`/`CLIENTE_ID` por valores reales obtenidos de `curl -b /tmp/empresa.txt http://localhost:3000/api/suscripciones`):

```bash
curl -b /tmp/empresa.txt -X POST http://localhost:3000/api/pagos \
  -H "Content-Type: application/json" \
  -d '{"suscripcionId":"SUSCRIPCION_ID","clienteId":"CLIENTE_ID","servicio":"Página web","monto":100,"fechaPago":"2026-07-06","fechaCobroAnterior":"2026-06-06","fechaProximoCobroNueva":"2026-08-06"}'
```
Expected: `201`.

```bash
curl -b /tmp/empresa.txt http://localhost:3000/api/pagos | python3 -m json.tool | grep -c '"id"'
```
Expected: `1` (o el número de pagos creados hasta ahora, todos de `empresa@demo.com`).

```bash
curl -b /tmp/superuser.txt http://localhost:3000/api/pagos | python3 -m json.tool | grep -c '"id"'
```
Expected: mismo número o más (ve todo).

```bash
curl -b /tmp/empresa.txt -X POST http://localhost:3000/api/pagos \
  -H "Content-Type: application/json" \
  -d '{"suscripcionId":"x","clienteId":"id-inventado","servicio":"Test","monto":10,"fechaPago":"2026-07-06","fechaCobroAnterior":"2026-06-06","fechaProximoCobroNueva":"2026-08-06"}'
```
Expected: `400` con `{"error":"El cliente seleccionado no existe."}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/pagos
git commit -m "feat: filtrar y validar dueño en /api/pagos según rol de sesión"
```