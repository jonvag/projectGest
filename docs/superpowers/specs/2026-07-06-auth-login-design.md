# Login + Sesión + Protección de Rutas

## Propósito

Primera de varias sub-entregas de la parte administrativa (roles, multi-empresa, gestión de usuarios, perfil). Esta cubre exclusivamente: autenticación básica por email/contraseña, sesiones persistidas en base de datos, y protección real (no solo de apariencia) de `/dashboard/**` y de las API routes existentes.

No incluye todavía: permisos diferenciados por rol, dueño (empresa) de clientes/suscripciones, pantalla de gestión de usuarios, cambio de contraseña en perfil — esos son specs separados que siguen a este.

## Alcance

Incluye:
- Modelos `User` (email único, hash de contraseña, rol) y `Session` (token, usuario, expiración) en Prisma.
- Script de seed que crea la cuenta superuser inicial.
- `POST /api/auth/login` y `POST /api/auth/logout`.
- Página `/login` con formulario email/contraseña.
- Protección real: el layout de `/dashboard` valida la sesión del lado del servidor (consulta a la base) y redirige a `/login` si no es válida; un middleware liviano hace un chequeo rápido (solo presencia de cookie) para evitar el flash de contenido protegido antes de esa validación.
- Todas las API routes existentes (`/api/clientes*`, `/api/suscripciones*`, `/api/pagos`) pasan a exigir sesión activa (cualquier rol) — sin esto, alguien podría saltarse el login llamando la API directo.
- El botón "Iniciar sesión" de la landing pasa a navegar a `/login` en vez de directo a `/dashboard`.
- Botón "Cerrar sesión" en el sidebar del dashboard.

No incluye:
- Filtrado de datos por rol o por empresa dueña (el modelo `Rol` existe como campo, pero ninguna query se restringe por él todavía).
- Pantalla para que el superuser cree otros usuarios (por ahora solo existe el superuser sembrado).
- Cambio de contraseña desde la UI.
- Recuperación de contraseña / "olvidé mi clave" (no hay email saliente en este proyecto).

## Modelo de datos

```prisma
enum Rol {
  SUPERUSER
  EMPRESA
  CLIENTE
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  rol          Rol
  creadoEn     DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id       String   @id @default(uuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiraEn DateTime
  creadoEn DateTime @default(now())
}
```

`Session.onDelete: Cascade` (a diferencia del `Restrict` que usamos entre `Cliente`/`Suscripcion`): una sesión es un registro efímero y dependiente de su usuario — borrar un usuario debe borrar sus sesiones, no bloquearse.

## Seed del superuser inicial

El script de seed (`prisma/seed.ts`, ya existente) se extiende para crear, además de los datos mock actuales:
- Email: `jon.apiscope.empresa@gmail.com`
- Contraseña inicial: generada aleatoriamente, comunicada una sola vez fuera de este documento (nunca se guarda en texto plano, solo su hash).
- Rol: `SUPERUSER`.

## Autenticación

- Contraseñas hasheadas con `bcryptjs` (JS puro, sin compilación nativa).
- Cookie de sesión: `projectgest_session`, `httpOnly`, `sameSite: "lax"`, `secure` en producción, `maxAge` de 7 días — coincide con `Session.expiraEn`.
- `POST /api/auth/login`: recibe `{ email, password }`, busca el `User` por email, compara con `bcryptjs.compare`, si coincide crea un `Session` y setea la cookie con su `id` como token. Si no coincide, `401` con un mensaje genérico ("Email o contraseña incorrectos") — no se revela cuál de los dos falló.
- `POST /api/auth/logout`: lee la cookie, borra el `Session` correspondiente en la base, limpia la cookie.
- Helper de servidor `requireSesion()`: lee la cookie, busca el `Session` (con su `User`), valida que no haya expirado. Devuelve la sesión o `null`. Se usa en:
  - El layout de `/dashboard` (redirige a `/login` si es `null`).
  - Cada handler de las API routes existentes (responde `401` si es `null`).

## Protección de rutas

- **Middleware** (`middleware.ts`, matcher `/dashboard/:path*`): chequeo barato, solo verifica que exista la cookie `projectgest_session` (sin consultar la base — los middlewares de Next.js corren en un entorno más restringido). Si no existe, redirige a `/login`. Esto evita el "flash" de contenido protegido mientras se resuelve la validación real.
- **Layout de `/dashboard`** (`app/dashboard/layout.tsx`): deja de ser un componente de cliente y pasa a ser un Server Component `async`, que llama a `requireSesion()` con acceso real a la base. Si no hay sesión válida, `redirect("/login")`. Esta es la validación autoritativa (el middleware es solo una optimización de UX).
- **API routes**: cada handler (`GET`/`POST`/`PUT`/`DELETE` en `/api/clientes`, `/api/clientes/[id]`, `/api/suscripciones`, `/api/suscripciones/[id]`, `/api/pagos`) empieza llamando a `requireSesion()` y devuelve `401` si no hay sesión.

## Página de login

`/login`: formulario simple (email, contraseña), botón "Iniciar sesión". Al enviar, `POST /api/auth/login`; si responde `ok`, navega a `/dashboard`; si responde error, muestra el mensaje debajo del formulario. Sigue el mismo estilo (`minimalist-ui`) que el resto de la app.

## Cambios sobre lo ya construido

- `components/login-button.tsx` (la landing): el `onClick` pasa de navegar a `/dashboard` a navegar a `/login`.
- `components/dashboard/sidebar.tsx`: se agrega un botón "Cerrar sesión" al final, que hace `POST /api/auth/logout` y despuués navega a `/login`.
- `app/dashboard/layout.tsx`: pasa de client component a server component (ver arriba).

## Testing / verificación

Sin test runner. Verificación manual:
- Login con el superuser sembrado (email + la clave generada) → entra a `/dashboard`.
- Login con contraseña incorrecta → error genérico, no entra.
- Visitar `/dashboard` (o cualquier subruta) sin sesión → redirige a `/login`.
- Llamar una API route (ej. `curl /api/clientes`) sin la cookie de sesión → `401`.
- Iniciar sesión, cerrar sesión, intentar volver a `/dashboard` → redirige a `/login` de nuevo (la sesión ya no existe en la base).
- El botón "Iniciar sesión" de la landing lleva a `/login`, no directo al dashboard.
