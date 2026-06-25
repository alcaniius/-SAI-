# 🚀 SAI - Guía de Inicio Rápido

## ⚠️ Requisitos Previos

- Node.js 20+
- pnpm (`corepack enable pnpm`)
- Docker Desktop (para PostgreSQL, Redis, MinIO)

---

## 📦 Instalación

### Backend

```bash
cd backend

# Instalar dependencias
pnpm install

# Generar Prisma Client
pnpm prisma generate

# Levantar infraestructura
docker compose up -d

# Ejecutar migraciones
pnpm prisma migrate dev --name init

# Iniciar servidor de desarrollo
pnpm start:dev
```

**Backend**: http://localhost:3001  
**Health Check**: http://localhost:3001/api/v1/health

### Frontend

```bash
cd Frontend

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

**Frontend**: http://localhost:3002

---

## 🧪 Testing

### Backend (72 tests unitarios + 24 e2e)

```bash
cd backend

# Tests unitarios con coverage
npx jest --coverage

# Tests e2e (requiere PostgreSQL + Redis corriendo)
# Primero: docker compose up -d
npx jest --config ./test/jest-e2e.json
```

**Resultado esperado**: 72 passed (unitarios), 22 passed (e2e — 2 tests requieren DB)

### Frontend (19 tests)

```bash
cd Frontend

# Tests con vitest
npx vitest run
```

**Resultado esperado**: 19 passed

---

## 🏗️ Build

### Backend

```bash
cd backend
pnpm build
```

### Frontend

```bash
cd Frontend
npx next build
```

---

## 📋 Comandos Útiles

```bash
# Backend
cd backend
pnpm start:dev           # Desarrollo
pnpm prisma studio       # UI de base de datos
pnpm lint                # Linting

# Frontend
cd Frontend
pnpm dev                # Desarrollo
npx next build          # Producción
npx vitest run          # Tests
```

---

## 🔐 Variables de Entorno

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://sai_user:PASSWORD@localhost:5432/sai_db?schema=public"

# JWT (GENERAR CON: openssl rand -base64 32)
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_secure_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# Redis (Rate Limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_password

# App
PORT=3001
NODE_ENV=development
API_PREFIX=api/v1

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3002

# Multi-tenant
DEFAULT_TENANT_HEADER=x-tenant-id
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=SAI - Sistema Ambiental Integrado
```

---

## ✅ Lo que está implementado

### Backend (11 módulos)
- [x] Autenticación JWT con refresh tokens (logout revoca solo el token presentado)
- [x] Sistema de roles (ADMIN, MANAGER, USER, AUDITOR) con RolesGuard global (APP_GUARD)
- [x] Multi-tenant con `@CurrentTenant()` en todos los controladores
- [x] CRUD de usuarios (protegido por RBAC)
- [x] CRUD de documentos con versiones, upload S3/MinIO, presigned download
- [x] Módulo ambiental (aspectos, PMAs con PDF async BullMQ, ANLA)
- [x] Módulo de residuos (Waste) con CRUD + tenant isolation
- [x] Módulo de inspecciones (Inspections) con CRUD + tenant isolation
- [x] Módulo de sitios (Sites) con certificados en S3
- [x] Módulo de huella de carbono (Carbon Footprint)
- [x] Módulo de alertas (Alerts)
- [x] Módulo de almacenamiento (Storage) — S3/MinIO con presigned URLs y fallback local
- [x] Módulo de automatización (Automation) — BullMQ + PDF async
- [x] Helmet (security headers)
- [x] Rate Limiting (@nestjs/throttler — 3 perfiles)
- [x] CORS dinámico

### Frontend (dashboard con 6 módulos)
- [x] Login con validación Zod v4
- [x] Registro con validación Zod v4
- [x] Dashboard con sidebar filtrado por rol (`navigation.ts`)
- [x] Refresh token automático en `api.ts` (un reintento, replay del request)
- [x] Gestión de documentos con modal create/edit (react-hook-form + Zod)
- [x] Módulo ambiental (matriz aspectos, PMAs, ANLA)
- [x] Páginas de Calidad, Educación, Indicadores, Alertas

---

## 🔜 Siguientes Pasos (Fase 2)

1. **Huella de Carbono**
   - Integración con motor de cálculo (FastAPI/Python)
   - Cálculos Scope 1, 2, 3

2. **Mejora de Tests**
   - Tests para controllers y DTOs
   - Coverage target: 60% global
   - Reparar 2 tests e2e que requieren PostgreSQL

3. **Cronograma ANLA**
   - Alertas automáticas por email (Nodemailer)
   - Reportes exportables

---

## 🐛 Problemas Comunes

### "Prisma no puede conectar a la base de datos"
- Verificar que PostgreSQL esté corriendo (`docker compose up -d` en `backend/`)
- Verificar `DATABASE_URL` en `backend/.env`
- Prisma v7 usa `@prisma/adapter-pg` — NO uses `url` en schema.prisma

### "Frontend no puede conectar al backend"
- Verificar que backend esté en `http://localhost:3001`
- Revisar `NEXT_PUBLIC_API_URL` en `Frontend/.env.local`
- Verificar CORS: `CORS_ORIGINS` en `backend/.env` debe incluir `http://localhost:3002`

### "Error de tipos TypeScript"
- Ejecutar `pnpm build` en `backend/` para verificar
- Frontend: `npx next build` en `Frontend/`

### "Tests e2e fallan con errores de autenticación DB"
- Requiere PostgreSQL corriendo: `cd backend && docker compose up -d`
- 2 tests (`invalid credentials`, `refresh invalid token`) requieren DB — 22/24 pasan sin ella

### "Error BullMQ / Redis connection refused"
- Requiere Redis corriendo: `docker compose up -d` en `backend/`
- Sin Redis, PDF generation no funciona pero el resto del sistema sí

### "Zod v4 validation errors"
- Usar `message` en `z.enum()`, NO `required_error`
- Ejemplo correcto: `z.enum(['LOW', 'MEDIUM'], { message: 'Requerido' })`

### "Formularios no se importan correctamente"
- Importar desde `react-hook-form`, NO `react-form`
- `zodResolver` desde `@hookform/resolvers/zod`

---

## 📞 Soporte

- Tests fallan: ejecutar `npx jest --coverage` para ver coverage
- Build falla: revisar errores de TypeScript con `pnpm build`
- Docker issues: `docker compose logs -f`

---

**Documento creado**: Abril 2026  
**Última actualización**: Junio 25, 2026  
**Versión**: 1.3 - Post-estabilización (PRs 1-6 integrados)