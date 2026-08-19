# Automotive AI SaaS

Plataforma multi-tenant de inteligencia automotriz para adquisición, marketing, ventas y formación.

## 🏗️ Arquitectura

```
automotive-ai-saas/
├── apps/
│   ├── api/                 # Cloudflare Workers API (Hono + Drizzle)
│   └── web/                 # Next.js 14 Dashboard (React 18 + Tailwind)
├── services/
│   ├── hermes/              # Orquestador IA central
│   ├── radar/               # Monitoreo continuo de listados
│   ├── crm/                 # Gestión de leads y pipeline
│   ├── communications/      # WhatsApp/Instagram/Email/SMS
│   ├── marketing/           # Campañas multicanal + IA
│   ├── video/               # Generación de videos con Wan2.1
│   ├── academy/             # LMS con certificaciones
│   └── billing/             # Stripe + límites de plan
├── packages/
│   ├── types/               # TypeScript types compartidos
│   ├── database/            # Drizzle ORM schema + migraciones
│   ├── auth/                # JWT + bcrypt + multi-tenant
│   ├── events/              # Event bus tipado
│   └── ai/                  # Proveedores IA (OpenAI, Anthropic, CF Workers AI)
└── infrastructure/
    ├── docker/
    └── cloudflare/
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- pnpm 9+
- Cuenta Cloudflare (Workers, D1, R2, KV, Queues, Pages)
- Cuenta Stripe (para billing)
- Cuenta Meta Business (WhatsApp/Instagram)

### Instalación Local

```bash
# Clonar e instalar dependencias
git clone <repo>
cd automotive-ai-saas
pnpm install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Iniciar base de datos local (Miniflare)
docker-compose up -d miniflare

# Ejecutar migraciones
cd apps/api && wrangler d1 migrations apply automotive-ai-db --local

# Iniciar desarrollo
pnpm dev
```

Esto iniciará:
- API en `http://localhost:8787`
- Web en `http://localhost:3000`
- Miniflare en `http://localhost:8788`

## 📦 Estructura de Servicios

### API (`apps/api`)
- **Framework**: Hono + Cloudflare Workers
- **Base de datos**: D1 (SQLite) con Drizzle ORM
- **Auth**: JWT (15min access / 7d refresh) + bcrypt
- **Multi-tenancy**: `organization_id` en todas las tablas

### Servicios Core

| Servicio | Descripción | Tecnologías |
|----------|-------------|-------------|
| **HERMES** | Orquestador IA con tool calling | Workers AI, OpenAI, Anthropic |
| **Radar** | Monitoreo de listados + scoring | Adapters, Queues, Cron |
| **CRM** | Pipeline Kanban + scoring leads | D1, Events |
| **Communications** | WhatsApp/IG/Email/SMS unificado | Meta Business API, Webhooks |
| **Marketing** | Campañas A/B + IA content | Templates, Segmentation |
| **Video** | Cola GPU + Wan2.1 templates | R2, Queues, FFmpeg |
| **Academy** | LMS + certificados + IA tutor | Modules, Quizzes, SCORM |
| **Billing** | Stripe + plan limits | Webhooks, Usage tracking |

## 🔐 Autenticación y Roles

### Roles de Organización
- `OWNER` - Acceso total
- `ADMIN` - Gestión completa excepto billing
- `MANAGER` - Leads, vehículos, campañas
- `SALES` - Leads, conversaciones, vehículos
- `MARKETING` - Campañas, videos, contenido
- `BUYER` - Radar, oportunidades
- `INSTRUCTOR` - Cursos, academia
- `STUDENT` - Cursos, certificados

### Endpoints Auth
```
POST   /auth/login           # Login
POST   /auth/register        # Registro + org
POST   /auth/refresh         # Refresh token
POST   /auth/logout          # Logout
POST   /auth/forgot-password # Reset password
POST   /auth/verify-email    # Verificar email
GET    /auth/me              # Usuario actual
```

## 📊 API Principal

### Vehículos
```
GET    /vehicles              # Listar (paginado, filtros)
POST   /vehicles              # Crear
GET    /vehicles/:id          # Detalle
PATCH  /vehicles/:id          # Actualizar
DELETE /vehicles/:id          # Eliminar
GET    /vehicles/listings     # Listados externos (Radar)
```

### Leads (Pipeline)
```
GET    /leads                 # Listar (kanban/list)
POST   /leads                 # Crear
GET    /leads/:id             # Detalle + conversación
PATCH  /leads/:id             # Actualizar (incluye status)
DELETE /leads/:id             # Eliminar
```

### Conversaciones
```
GET    /conversations         # Lista con filtros
GET    /conversations/:id     # Mensajes + enviar
PATCH  /conversations/:id     # Cambiar estado (BOT/HUMAN/ESCALATED)
POST   /conversations/:id/messages # Enviar mensaje
```

### Campañas
```
GET    /campaigns             # Listar
POST   /campaigns             # Crear (con A/B test)
GET    /campaigns/:id         # Detalle + métricas
PATCH  /campaigns/:id         # Actualizar
POST   /campaigns/:id/send    # Enviar/programar
```

### Videos
```
GET    /videos/jobs           # Cola de trabajos
POST   /videos/jobs           # Crear job
GET    /videos/jobs/:id       # Estado + progreso
POST   /videos/jobs/:id/retry # Reintentar fallido
```

### Academia
```
GET    /courses               # Catálogo
POST   /courses               # Crear curso (módulos/lecciones)
GET    /courses/:id           # Detalle + contenido
POST   /courses/:id/enroll    # Inscribir
GET    /enrollments           # Mis inscripciones
POST   /enrollments/:id/progress # Actualizar progreso
POST   /enrollments/:id/certificate # Generar certificado
```

### Radar
```
GET    /radar/sources         # Fuentes configuradas
POST   /radar/sources         # Agregar fuente
GET    /radar/rules           # Reglas de filtrado
POST   /radar/rules           # Crear regla
POST   /radar/run             # Ejecutar sincronización
GET    /radar/opportunities   # Oportunidades detectadas
```

## 🎨 Frontend (Dashboard)

### Páginas Implementadas
- `/dashboard` - Resumen ejecutivo con KPIs
- `/dashboard/vehicles` - Inventario + Listados + Radar
- `/dashboard/leads` - Pipeline Kanban + Lista
- `/dashboard/conversations` - Bandeja unificada
- `/dashboard/marketing` - Campañas + Analytics
- `/dashboard/videos` - Cola de generación + Plantillas
- `/dashboard/academy` - Cursos + Inscripciones
- `/dashboard/settings` - Org, Miembros, Billing, Radar, API Keys

### Stack
- Next.js 14 App Router
- React 18 + TypeScript
- Tailwind CSS + Lucide Icons
- TanStack Query (server state)
- Socket.io (real-time)
- React Hook Form + Zod

## ☁️ Deployment Cloudflare

### 1. Configurar Recursos Cloudflare

```bash
# D1 Database
wrangler d1 create automotive-ai-db

# R2 Bucket
wrangler r2 bucket create automotive-ai-assets

# KV Namespaces
wrangler kv:namespace create KV
wrangler kv:namespace create KV --preview

# Queues
wrangler queues create events
wrangler queues create video-jobs
wrangler queues create email-jobs
```

### 2. Variables de Entorno (Cloudflare Dashboard)

**Workers (API):**
```
JWT_SECRET=...
JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

**Pages (Web):**
```
NEXT_PUBLIC_API_URL=https://api.tudominio.com
```

### 3. Deploy

```bash
# API
cd apps/api
wrangler deploy --env production

# Web (Pages)
cd apps/web
wrangler pages deploy .next --project-name=automotive-ai-web
```

### 4. Migraciones y Seed

```bash
# Migraciones
wrangler d1 migrations apply automotive-ai-db --remote --env production

# Seed (solo preview/staging)
wrangler d1 execute automotive-ai-db --remote --env preview --file=../../packages/database/migrations/seed.sql
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Todo (concurrently)
pnpm dev:api          # Solo API
pnpm dev:web          # Solo Web

# Build
pnpm build            # Todo
pnpm build:api        # Solo API
pnpm build:web        # Solo Web

# Database
pnpm db:generate      # Generar migraciones
pnpm db:migrate       # Aplicar migraciones (local)
pnpm db:seed          # Seed data (local)
pnpm db:studio        # Drizzle Studio

# Calidad
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm test             # Tests
pnpm format           # Prettier

# Deploy
pnpm deploy:api       # Deploy API
pnpm deploy:web       # Deploy Web
```

## 📁 Variables de Entorno

### API (`apps/api/.env`)
```env
NODE_ENV=development
LOG_LEVEL=debug
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Web (`apps/web/.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
NEXT_TELEMETRY_DISABLED=1
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Type checking
pnpm typecheck
```

## 📈 Observabilidad

- **Logs**: Cloudflare Workers Logs + Tail
- **Métricas**: Cloudflare Workers Metrics (CPU, Requests, Errors)
- **Tracing**: OpenTelemetry compatible
- **Alertas**: Configurar en Cloudflare Dashboard

## 🔒 Seguridad

- Headers de seguridad (CSP, HSTS, etc.)
- Rate limiting por IP/organización
- Validación Zod en todos los endpoints
- Sanitización de inputs
- CORS configurado por organización
- API Keys con scopes/permisos

## 🤝 Contribuir

1. Fork del repo
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- **Documentación**: `/docs`
- **Issues**: GitHub Issues
- **Email**: soporte@automotive-ai.com