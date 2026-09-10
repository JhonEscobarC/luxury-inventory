# LUXURY - Diseno y Construccion

Sistema de gestion de obras, pedidos de materiales y proveedores para
constructora. Monorepo con frontend (React + Vite + Tailwind) y backend
(Node.js + Express + Prisma + PostgreSQL).

## Estructura

```
Luxury-inventory/
├── backend/         API REST (Express + Prisma + JWT)
├── frontend/        SPA (React + Vite + Tailwind)
└── docker-compose.yml  PostgreSQL para desarrollo local
```

## Requisitos

- Node.js 20+
- Docker Desktop (para PostgreSQL local)

## Puesta en marcha

```bash
# 1. Instalar dependencias (raiz + workspaces)
npm install

# 2. Levantar PostgreSQL
npm run db:up

# 3. Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Migrar la base de datos y generar el cliente de Prisma
npm run prisma:migrate

# 5. Crear usuarios/obras/proveedores de prueba
npm run prisma:seed

# 6. Levantar backend + frontend en paralelo
npm run dev
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## Produccion

| Servicio | Proveedor | URL |
|---|---|---|
| Frontend | Vercel | https://frontend-rosy-nine-80.vercel.app |
| Backend | Railway | https://backend-production-97644.up.railway.app |
| Base de datos | Railway (Postgres) | privada, solo accesible desde el backend |

**Despliegue continuo:**
- Frontend (Vercel): conectado a GitHub, cada `git push` a `master` despliega automaticamente.
- Backend (Railway): desplegado manualmente via `railway up` desde `backend/` (ver mas abajo). El auto-deploy desde GitHub quedo pendiente porque Railway necesita autorizacion explicita para acceder al repo — en el dashboard de Railway, entra al servicio `backend` → Settings → Source → Connect Repo, autoriza la Railway GitHub App para `luxury-inventory`, y desde ahi cada push desplegara solo.

**Para redesplegar el backend manualmente** (mientras no este conectado a GitHub):

```bash
railway login          # una sola vez
railway link           # vincula esta carpeta al proyecto luxury-inventory
railway up backend --path-as-root --service backend --yes --detach
```

Despues de cambios al schema de Prisma, corre tambien la migracion en
produccion (`railway ssh --service backend -- npx prisma migrate deploy`)
antes o despues del deploy.

**Variables de entorno en produccion** se administran con `railway variable set KEY=VALUE --service backend` (o desde el dashboard). `DATABASE_URL` ya esta configurada como referencia al servicio de Postgres (`${{Postgres.DATABASE_URL}}`), y `JWT_SECRET` fue generado aleatoriamente durante el despliegue.

## Roles y flujo de pedidos

| Rol | Que hace |
|---|---|
| **ADMIN** | Acceso total: usuarios, obras, proveedores, inventario, pedidos, reportes. |
| **CONTABILIDAD** | Gestiona obras y proveedores, revisa pedidos entrantes, les asigna proveedor y precio, y actualiza su estado (confirmar/despachar/cancelar). Tambien administra inventario. |
| **OBRA** | Usuario de campo. Ve solo sus obras asignadas, crea pedidos de materiales (descripcion libre, cantidad, unidad) para esas obras, y puede editar/cancelar los propios mientras esten pendientes. |

**Ciclo de vida de un pedido:**

1. Un usuario **OBRA** elige una de sus obras y arma el pedido (uno o varios materiales, en texto libre — no depende del catalogo de inventario).
2. El pedido llega a **CONTABILIDAD** en estado `PENDIENTE`.
3. Contabilidad le asigna un **proveedor** y un **precio unitario por material** → el pedido pasa a `CONFIRMADO`.
4. Cuando el material llega a la obra, contabilidad lo marca como `DESPACHADO` (estado final).
5. En cualquier punto antes de `DESPACHADO`, el pedido puede pasar a `CANCELADO` (por contabilidad, o por el usuario OBRA si es suyo y sigue pendiente).

## Usuarios de prueba (creados por el seed)

| Rol | Email | Password |
|---|---|---|
| ADMIN | admin@luxury.com | Admin123! |
| CONTABILIDAD | contabilidad@luxury.com | Contabilidad123! |
| OBRA | obra1@luxury.com | Obra123! (asignado a "Torre Norte") |
| OBRA | obra2@luxury.com | Obra123! (asignado a "Conjunto Sur") |

El seed tambien crea 2 obras y 2 proveedores de ejemplo.

## Estado actual

- [x] Estructura de proyecto (monorepo con npm workspaces)
- [x] Autenticacion JWT con roles (admin, contabilidad, obra)
- [x] Modelo de datos (usuarios, obras, proveedores, productos, pedidos)
- [x] CRUD de inventario con alertas de stock bajo (ADMIN y CONTABILIDAD)
- [x] CRUD de obras, con asignacion de usuarios OBRA
- [x] CRUD de proveedores
- [x] Pedidos: obra crea (texto libre) -> contabilidad asigna proveedor y precio -> despacho, con aislamiento por obra (un usuario OBRA solo ve sus propios pedidos)
- [x] Modulo de informes (exportacion PDF/Excel) para inventario y pedidos
- [x] Panel de usuarios (solo ADMIN): crear, editar rol, restablecer contrasena, activar/desactivar

## Diseno visual

La paleta y los componentes siguen la guia "Midnight Gilded Architectural":
fondo `#0A0A0A`, acento dorado `#C6A15B`, tipografia Hanken Grotesk, sidebar
fijo de 280px en escritorio y navegacion inferior en movil. Los tokens estan
replicados en `frontend/tailwind.config.ts`.
