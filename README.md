# LUXURY - Diseno y Construccion

Sistema de gestion de inventario y pedidos para constructora. Monorepo con
frontend (React + Vite + Tailwind) y backend (Node.js + Express + Prisma +
PostgreSQL).

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

# 5. Crear usuarios de prueba
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

**Variables de entorno en produccion** se administran con `railway variable set KEY=VALUE --service backend` (o desde el dashboard). `DATABASE_URL` ya esta configurada como referencia al servicio de Postgres (`${{Postgres.DATABASE_URL}}`), y `JWT_SECRET` fue generado aleatoriamente durante el despliegue.

**Usuarios de prueba en produccion**: se sembraron los mismos 3 usuarios de la tabla de abajo (`npx tsx prisma/seed.ts` corrido una vez via `railway ssh`). El inventario y los pedidos de produccion empiezan vacios — no se cargo ningun dato de prueba ahi.

## Usuarios de prueba (creados por el seed)

| Rol    | Email             | Password    |
|--------|-------------------|-------------|
| ADMIN  | admin@luxury.com  | Admin123!   |
| BODEGA | bodega@luxury.com | Bodega123!  |
| VENTAS | ventas@luxury.com | Ventas123!  |

## Estado actual

- [x] Estructura de proyecto (monorepo con npm workspaces)
- [x] Autenticacion JWT con roles (admin, bodega, ventas)
- [x] Modelo de datos (usuarios, productos, pedidos, logs de WhatsApp)
- [x] CRUD de inventario con alertas de stock bajo
- [x] Pedidos manuales: crear, editar (mientras esten pendientes) y cambiar estado, con descuento automatico de stock al despachar
- [x] Webhook de WhatsApp Cloud API (Meta): verificacion, recepcion y registro de mensajes, envio de respuestas y conversion de un mensaje en pedido. Falta solo cargar credenciales reales (ver abajo)
- [x] Modulo de informes (exportacion PDF/Excel) para inventario y pedidos
- [x] Panel de usuarios (solo ADMIN): crear, editar rol, restablecer contrasena, activar/desactivar

## Conectar WhatsApp Cloud API (Meta)

El codigo esta listo, solo falta la configuracion en `backend/.env`:

1. Crea una app de tipo "Business" en https://developers.facebook.com y agrega el producto **WhatsApp**.
2. Copia el **Access Token** temporal (o uno permanente de un System User) y el **Phone Number ID** de prueba.
3. Completa en `backend/.env`:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_VERIFY_TOKEN`: cualquier string que tu elijas (se usa en el paso 4)
   - `WHATSAPP_APP_SECRET`: el "App Secret" de la app de Meta (habilita la validacion de firma de cada evento)
4. En el panel de WhatsApp de Meta, configura el webhook con la URL publica `https://backend-production-97644.up.railway.app/api/whatsapp/webhook` y el mismo `WHATSAPP_VERIFY_TOKEN` del paso anterior (en desarrollo local necesitarias exponer el backend con ngrok, pero en produccion ya es publico).
5. Suscribete al campo `messages`.
6. Reinicia el backend. La tarjeta de WhatsApp en el Dashboard deja de mostrar el aviso de "no conectado" cuando las credenciales estan completas.

## Diseno visual

La paleta y los componentes siguen la guia "Midnight Gilded Architectural":
fondo `#0A0A0A`, acento dorado `#C6A15B`, tipografia Hanken Grotesk, sidebar
fijo de 280px en escritorio y navegacion inferior en movil. Los tokens estan
replicados en `frontend/tailwind.config.ts`.
