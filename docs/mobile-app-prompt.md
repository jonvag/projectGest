# Prompt: generar la app Android (Kotlin) de projectGest

Pegar esto en Android Studio (Gemini/Studio AI) o en una sesión nueva de Claude Code apuntada a un repo Android vacío.

## Contexto

projectGest es un dashboard web (Next.js) para que un freelancer/agencia gestione clientes, suscripciones recurrentes, pagos y notificaciones de cobro. Esta app Android es un cliente mobile de ese mismo backend, **para el dueño de la cuenta** (rol `EMPRESA` o `SUPERUSER`) — no para sus clientes finales.

- Backend base URL: `https://project-gest.nex-gen.digital`
- Todo en JSON. Todas las rutas salvo `/api/auth/mobile/*` requieren header `Authorization: Bearer <accessToken>`.

## Stack

- Kotlin, minSdk 26+
- **Jetpack Compose (Material 3)** para toda la UI — nada de XML views
- Retrofit + OkHttp + kotlinx.serialization para la capa de red
- `androidx.security-crypto` (EncryptedSharedPreferences) o DataStore cifrado para guardar los tokens — nunca `SharedPreferences` plano
- Coroutines + Flow
- Navigation Compose
- Hilt opcional; si el generador no lo maneja bien, un service locator simple alcanza

## Autenticación

### Login
`POST /api/auth/mobile/login`
Body: `{"email": string, "password": string}`

200:
```json
{
  "accessToken": "jwt...",
  "accessTokenExpiraEnSegundos": 1800,
  "refreshToken": "uuid...",
  "refreshTokenExpiraEn": "2026-10-03T16:36:35.020Z",
  "usuario": { "id": "...", "email": "...", "nombre": "string|null", "rol": "SUPERUSER|EMPRESA|CLIENTE" }
}
```
401: `{"error": "Email o contraseña incorrectos."}`

### Refresh
`POST /api/auth/mobile/refresh` — Body: `{"refreshToken": string}`
200: `{"accessToken": "jwt...", "accessTokenExpiraEnSegundos": 1800}`
401: el refresh token venció → borrar todo lo guardado y volver a Login.

### Logout
`POST /api/auth/mobile/logout` — Body: `{"refreshToken": string}` → `{"ok": true}`

### Flujo de la app
1. Al abrir: ¿hay `refreshToken` guardado?
   - No → pantalla de Login.
   - Sí → intentar refresh en silencio. Si funciona, ir directo al Dashboard. Si da 401, borrar tokens y mostrar Login.
2. Login exitoso → guardar `accessToken` + `refreshToken` cifrados → Dashboard.
3. **Authenticator de OkHttp**: cualquier request que devuelva 401 dispara un refresh automático y reintenta la request original una vez. Si el refresh también falla, desloguear (borrar tokens, volver a Login). Este es el mecanismo central que hace que el usuario "quede logueado" entre usos de la app sin escribir la contraseña de nuevo.
4. "Cerrar sesión" llama a `/api/auth/mobile/logout` con el refresh token y borra todo lo local.

### Roles
`usuario.rol` es `SUPERUSER`, `EMPRESA` o `CLIENTE`. Esta app es para `SUPERUSER`/`EMPRESA`. El backend ya filtra los datos por rol automáticamente (un `EMPRESA` solo ve sus propios clientes) — la app no necesita reimplementar ese filtro, solo mostrar lo que la API devuelve.

## Endpoints de datos (GET, con Bearer token)

- `GET /api/clientes` → `[{id, usuarioId, userId: string|null, nombre, empresa, contactId, email, creadoEn}]`
- `GET /api/suscripciones` → `[{id, clienteId, servicio, monto: number, ciclo: "mensual|trimestral|anual", proximoCobro: "YYYY-MM-DD"}]`
- `GET /api/pagos` → `[{id, suscripcionId, clienteId, servicio, monto, fechaPago, fechaCobroAnterior, fechaProximoCobroNueva, descripcion: string|null, referencia: string|null}]` (fechas `YYYY-MM-DD`)
- `GET /api/notificaciones` → `[{id, cliente: {nombre}, suscripcion: {servicio}, canal, estado: "enviado|fallido", detalle: string|null, enviadoEn: ISO}]`
- `GET /api/reportes-pago` → `[{id, suscripcionId, clienteId, referencia: string|null, comprobanteTipo: string|null, estado: "pendiente|verificado|rechazado", creadoEn, revisadoEn, clienteNombre, servicio, ciclo, proximoCobro}]`. Si `comprobanteTipo` es `null` el reporte **no tiene foto** — no mostrar el botón de verla (mismo criterio que la web).
- `GET /api/reportes-pago/{id}/comprobante` → imagen binaria. Pedirla solo cuando el usuario toca "ver foto", nunca precargada en la lista (evita descargar fotos pesadas de todos los reportes solo para una miniatura).
- `GET /api/empresas` → solo si `rol == SUPERUSER`: `[{id, email, nombre, creadoEn, _count: {clientes: number}}]`

## Escritura

- `POST /api/clientes` — `{nombre, empresa, contactId, email, usuarioId?}` (`usuarioId` solo lo manda un SUPERUSER, para elegir la empresa dueña)
- `POST /api/suscripciones` — `{clienteId, servicio, monto, ciclo, proximoCobro: "YYYY-MM-DD"}`
- `PATCH /api/reportes-pago/{id}` — `{estado: "verificado", fechaProximoCobro: "YYYY-MM-DD"}` para verificar, o `{estado: "rechazado"}` para rechazar.

Errores: `{"error": "mensaje en español"}` con status 400/401/403 — mostrarlo tal cual en un Snackbar.

## Métricas del dashboard (calcularlas en la app — no hay endpoint dedicado)

A partir de `GET /api/suscripciones` completo, igual que hace la web:

- **Ingresos esperados este mes**: suma de `monto` de las suscripciones cuyo `proximoCobro` cae en el mes y año calendario actuales.
- **Cobros vencidos**: suscripciones cuyo `proximoCobro` (string `YYYY-MM-DD`) es menor a la fecha de hoy en el mismo formato — la comparación de strings ISO funciona directamente. Sumar montos para el total.
- **Próximos cobros de la semana**: `proximoCobro` entre hoy y hoy+7 días, inclusive.

## Identidad visual — "glass + gradient"

Fondo con blobs de gradient radial cálidos que se mueven lento (naranja/violeta/verde), cards en vidrio esmerilado (translúcidas + blur), acentos en gradient naranja→violeta para botones y estados activos. Soporta claro y oscuro.

### Paleta (definir como `Color`/`Brush` en Compose)

**Claro**
| Uso | Valor |
|---|---|
| Fondo base | `#F5FAEB` |
| Superficie/card | Blanco 55% opacidad, sobre el fondo con blobs |
| Borde de card | Blanco 75% opacidad |
| Texto principal / secundario | `#111111` / `#787774` |
| Gradient de acento | `linear-gradient(135deg, #FF9D6E, #C9A6FF)` |
| Blobs de fondo | `#FFDFC2`, `#D9C2FF`, `#C2F0D9` (radiales, ~45% de ancho c/u, opacidad combinada ~0.7) |
| Danger (vencido) | fondo `rgba(255,130,110,0.16)`, texto `#9F2F2D` |
| Success | fondo `rgba(120,200,140,0.16)`, texto `#346538` |

**Oscuro**
| Uso | Valor |
|---|---|
| Fondo base | `#111110` |
| Superficie/card | Blanco 5% opacidad |
| Borde de card | Blanco 9% opacidad |
| Texto principal / secundario | `#F7F6F3` / `#A8A29A` |
| Gradient de acento | `linear-gradient(135deg, #C9855C, #8A5FC9)` |
| Blobs de fondo | `#4A2F5C`, `#2F3F5C`, `#2F5C4A`, opacidad ~0.5 |
| Danger | fondo `rgba(255,120,100,0.14)`, texto `#E08585` |
| Success | fondo `rgba(120,220,150,0.12)`, texto `#8FC98F` |

### Componentes clave a replicar

- **Fondo animado**: `Box` con 2-3 blobs de `Brush.radialGradient` moviéndose muy lento en loop infinito (`rememberInfiniteTransition` sobre el offset de cada blob) — sutil, no llamativo.
- **Card de métrica** (dashboard): valor grande y bold, label chico arriba, animación de conteo de 0 al valor final (~2s, ease-out) al entrar en pantalla.
- **Card de item de lista**: ícono + título arriba, badges como chips redondeados (acento o estado), chips de datos secundarios con un tinte sutil (oscuro sobre fondo claro / claro sobre fondo oscuro — nunca un color sólido plano, tiene que sentirse parte del mismo vidrio), acciones (editar/borrar/verificar) como íconos en columna a la derecha, separados por una línea vertical fina.
- **Botón primario**: fondo con el gradient de acento, texto blanco, esquinas redondeadas (~8dp).
- **Badge "Vencido"**: fondo sólido (no translúcido) usando el color de texto danger como fondo y el color de fondo de la app como texto, para que resalte incluso sobre una card ya teñida de rojo.

### Assets/imágenes

No hace falta generar imágenes — todo el fondo son gradients de Compose (`Brush.radialGradient`), sin assets. La textura de grano sutil de la web es opcional y de bajo impacto en una pantalla de celular; se puede omitir.

## Pantallas mínimas

1. Login
2. Dashboard (3 métricas + cobros vencidos + próximos cobros)
3. Clientes (lista + detalle + crear)
4. Suscripciones (lista + crear)
5. Reportes de pago (lista + ver foto si tiene + verificar/rechazar)
6. Historial de pagos (lista, solo lectura)
7. Notificaciones (lista, solo lectura)
8. Empresas (solo si `rol == SUPERUSER`)
9. Ajustes/perfil con botón de cerrar sesión

## Fuera de alcance en esta primera versión

- Editar o borrar clientes/suscripciones desde la app (solo lectura + crear + las acciones de reportes-pago)
- Subir fotos desde la app (ese flujo es público, en `/reportar/[token]`, para los clientes del usuario — no para esta app)
- Push notifications (no hay backend para eso todavía)
