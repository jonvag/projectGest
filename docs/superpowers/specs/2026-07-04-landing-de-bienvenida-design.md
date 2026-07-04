# Landing de bienvenida — projectGest

## Propósito

Punto de entrada personal a `projectGest`, la herramienta que el usuario (freelancer/programador) va a usar para controlar clientes, servicios contratados y cobros recurrentes. No es una landing de marketing pública para captar otros usuarios; es la puerta de acceso antes de loguearse.

## Alcance

Incluye:
- Inicialización del proyecto Next.js en la raíz del repo.
- La landing de bienvenida (`/`) y el layout base de la app.
- Toggle de tema claro/oscuro.
- Botón de "Iniciar sesión" sin funcionalidad real (stub visual).

No incluye (specs futuros separados):
- Autenticación real / flujo de login.
- Dashboard.
- Tabla de clientes (nombre, empresa, contacto, email, servicio, características, monto, periodicidad).
- Motor de cobros recurrentes y recordatorios.

## Arquitectura

- Next.js (última versión estable al momento de crear el proyecto), App Router, TypeScript.
- Proyecto inicializado en la raíz de este repo (coincide con lo que ya asume el `Dockerfile`: `COPY . .` y `npm run build` desde la raíz).
- Tailwind CSS, agregado en la creación del proyecto — el skill `minimalist-ui` está escrito en términos de clases Tailwind.
- Dependencia `motion` (ya declarada en el proyecto) para animaciones.
- Node: usar la versión instalada localmente (`v20.20.2`).
- Gestor de paquetes: npm.

## Contenido / copy

- Nombre del producto: `projectGest`.
- Tagline: "Control de clientes, servicios y cobros en un solo lugar."
- Botón: "Iniciar sesión" (sin acción real por ahora; puede loguear en consola o no hacer nada).

## Layout y componentes

- **Nav superior** (fina, ligera): nombre del producto a la izquierda; a la derecha, toggle de tema claro/oscuro y botón de login.
- **Hero**: centrado verticalmente en el resto del viewport. Nombre del producto en tipografía editorial serif (grande), tagline debajo en sans-serif.
- Sin secciones adicionales (sin features, pricing, testimonios, footer largo). Minimalista puro, todo cabe en un viewport sin scroll.

## Estilo visual

Sigue el protocolo del skill `minimalist-ui` (`.agents/skills/minimalist-ui/SKILL.md`):
- Paleta monocromática cálida en modo claro (fondo `#FBFBFA`/`#FFFFFF`, texto `#111111`) y su contraparte en modo oscuro (fondo carbón cálido, texto claro).
- Sin gradientes ni sombras pesadas; bordes `1px solid` donde aplique.
- Contraste tipográfico editorial: serif para el nombre/hero, sans-serif para tagline y UI, monoespaciada si se necesita meta-info.
- El toggle de tema persiste la preferencia del usuario en `localStorage` y usa `prefers-color-scheme` como valor inicial por defecto.

## Interacción / motion

- Fade-in sutil del contenido del hero al cargar la página (`translateY(12px)` + `opacity: 0` → estado final, usando `motion`). Sin animaciones disparadas por scroll, ya que no hay scroll (todo cabe en un viewport).
- Botón de login con micro-scale (`scale(0.98)`) al hacer click/tap. No navega a ninguna ruta funcional todavía.

## Testing / verificación

Verificación manual (no hay backend ni lógica de negocio que testear unitariamente en esta etapa):
- Correr `next dev` y revisar la landing en el navegador.
- Verificar el toggle de tema (claro/oscuro) y que persista al recargar.
- Verificar responsive en mobile y desktop.
- Verificar que el botón de login no rompa nada al hacer click (no hay ruta destino real todavía).
