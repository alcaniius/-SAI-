# SAI - Sistema Ambiental Integrado

> Plataforma SaaS para automatizar la gestión ambiental, documental y educativa de empresas en Colombia, alineada con las normas ISO 14001 e ISO 9001.

## 📋 Tabla de Contenidos
- [Estado del Proyecto](#estado-del-proyecto)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Seguridad Implementada](#seguridad-implementada)
- [Testing](#testing)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Cómo Empezar](#cómo-empezar)
- [Próximos Pasos](#próximos-pasos)
- [Despliegue con Dokploy](#despliegue-con-dokploy)
- [Documentación Adicional](#documentación-adicional)

---

## Estado del Proyecto

### ✅ Fase 1 - Fundamentos (COMPLETADA)
- [x] Infraestructura base (NestJS + Next.js)
- [x] Autenticación JWT + RBAC global (RolesGuard como APP_GUARD)
- [x] Sistema multi-tenant con `@CurrentTenant()` en todos los controladores
- [x] Módulo de Gestión Documental con almacenamiento S3/MinIO
- [x] Frontend: Login, Registro, Dashboard con sidebar filtrado por rol
- [x] Frontend: Interfaz de gestión documental con modal create/edit
- [x] Docker Compose para desarrollo local
- [x] Configuración para Dokploy
- [x] **Seguridad**: Helmet, Rate Limiting (3 perfiles), CORS dinámico, ValidationPipe global
- [x] **RBAC**: Global via `APP_GUARD`, `@Public()` para auth/health, `AUDITOR` solo lectura, frontend sidebar filtrado
- [x] **Testing**: 72 tests unitarios + 24 e2e (backend), 19 tests (frontend)

### 🔄 Fase 2 - Núcleo Ambiental (ESTABILIZADA)
- [x] Matriz de aspectos e impactos (backend + frontend)
- [x] API de PMAs y Reportes ANLA
- [x] Generación automática de PMA (PDF async con BullMQ + pdf-lib)
- [x] Módulo de almacenamiento S3/MinIO (`StorageService`) con presigned URLs
- [x] Almacenamiento de documentos y certificados de sitio en S3
- [x] Módulo de residuos (Waste)
- [x] Módulo de inspecciones (Inspections)
- [x] Módulo de alertas (Alerts)
- [x] Módulo de huella de carbono (Carbon Footprint) — estructura backend
- [ ] Huella de carbono: integración FastAPI/Python
- [ ] Cronograma de reportes ANLA con alertas (Nodemailer)

### 🔄 Fase 3 - App Móvil (PENDIENTE)
- [ ] App Flutter
- [ ] Formularios offline
- [ ] Geolocalización
- [ ] Informes de campo

### 🔄 Fase 4 - LMS y Calidad (PENDIENTE)
- [x] Modelos de datos en schema.prisma (Course, Audit, NonConformity, Certificate)
- [ ] Cursos y evaluaciones
- [ ] Certificados QR
- [ ] Auditorías
- [ ] No conformidades

### 🔄 Fase 5 - Dashboard y Automatización (PENDIENTE)
- [ ] Panel en tiempo real (WebSockets)
- [ ] Alertas automáticas
- [ ] Búsqueda Elasticsearch
- [ ] Generación avanzada de documentos

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    SAI - Arquitectura                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐              ┌──────────────┐              │
│  │   Frontend   │              │   Backend    │              │
│  │  Next.js 16  │◄────────────►│  NestJS 11   │              │
│  │  React 19    │   REST API   │  TypeScript  │              │
│  └──────────────┘              └──────┬───────┘              │
│         │                             │                       │
│         │                             │                       │
│         ▼                             ▼                       │
│  ┌──────────────────────────────────────────────┐           │
│  │           PostgreSQL 16 (Multi-tenant)       │           │
│  │  Schema por organización + Row-Level Security│           │
│  └──────────────────────────────────────────────┘           │
│         │                             │                       │
│         ▼                             ▼                       │
│  ┌──────────────┐              ┌──────────────┐              │
│  │    Redis     │              │    MinIO     │              │
│  │  (Throttler) │              │   (S3 Docs)  │              │
│  └──────────────┘              └──────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Backend (`/backend`)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| NestJS | 11 | Framework backend |
| TypeScript | 5 | Lenguaje principal |
| Prisma | 7 | ORM |
| PostgreSQL | 16 | Base de datos |
| Passport.js | - | Autenticación |
| JWT | - | Tokens de acceso |
| bcrypt | 6 | Hash de contraseñas |
| Redis | 7 | Rate Limiting |
| MinIO | latest | Almacenamiento S3 |
| Helmet | 8 | Security headers |

### Frontend (`/Frontend`)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 16 | Framework React |
| React | 19 | UI library |
| Tailwind CSS | 4 | Estilos |
| Zustand | 5 | Estado global |
| TanStack Query | 5 | Fetching y caché |
| Recharts | 3 | Gráficas |
| React Hook Form | 7 | Formularios |
| Zod | 4 | Validación |
| Axios | 1 | HTTP client |
| Vitest | 4 | Testing |

---

## Seguridad Implementada

### ✅ Middleware de Seguridad
| Seguridad | Implementación | Archivo |
|-----------|---------------|---------|
| **Helmet** | HTTP security headers (CSP, X-Frame-Options, etc.) | `main.ts` |
| **Rate Limiting** | @nestjs/throttler: short (3/s), medium (20/10s), long (100/min) | `app.module.ts` |
| **CORS** | Dinámico por `CORS_ORIGINS`, validación por request | `main.ts` |
| **ValidationPipe** | whitelist, forbidNonWhitelisted, transform | `main.ts` |

### ✅ RBAC (Roles-Based Access Control)
| Endpoint | ADMIN | MANAGER | USER | AUDITOR |
|----------|-------|---------|------|---------|
| `/health`, `/auth/*` | ✅ Público | ✅ Público | ✅ Público | ✅ Público |
| `/users` | CRUD | Read | - | - |
| `/documents` | CRUD | CRUD | Create/Read | Read |
| `/environmental/aspects` | CRUD | CRUD | Read | Read |
| `/environmental/pma` | CRUD | CRUD | Read | Read |
| `/environmental/anla` | CRUD | CRUD | Read | Read |
| `/sites` | CRUD | CRUD | Read | Read |
| `/waste` | CRUD | CRUD | Crea/Lee | Read |
| `/inspections` | CRUD | CRUD | Crea/Lee | Read |
| `/alerts` | CRUD | CRUD | Crea/Lee | Read |
| `/carbon-footprint` | CRUD | CRUD | Read | Read |
| `/storage` | Upload | Upload | - | - |

> **Enforcement**: RolesGuard es `APP_GUARD` global. `AUDITOR` solo GET — cualquier mutación retorna `403`. Rutas sin token (auth, health) usan `@Public()`.

### ✅ Fixes de Seguridad Implementados
- **Self-role-assignment**: Registro ya no permite asignar rol — siempre `USER`
- **JWT secrets**: Usa `ConfigService.getOrThrow()` en lugar de `process.env` directo
- **Users update**: Pasa `@Body()` correctamente en vez de objeto vacío
- **Logout**: Revoca solo el refresh token presentado (no todos los del usuario)
- **DATABASE_URL**: Resuelto via `ConfigService` con fail-fast en bootstrap
- **Role literals**: Todos los `@Roles()` usan enum `Role` de `@prisma/client`
- **AUDITOR enforcement**: El guard global bloquea cualquier mutación por `AUDITOR` (solo GET)

---

## Testing

### Cobertura Backend (72 tests unitarios + 24 e2e)

| Suite | Tests | Coverage Stmts |
|-------|-------|----------------|
| `auth.service.spec.ts` | 8 | 98% |
| `documents.service.spec.ts` | 10 | 100% |
| `environmental.service.spec.ts` | 12 | 97% |
| `users.service.spec.ts` | 6 | 100% |
| `storage.service.spec.ts` | 8 | 75% |
| `pdf.service.spec.ts` | 10 | 85% |
| `prisma.service.spec.ts` | 4 | 100% |
| `roles.guard.spec.ts` | 8 | 100% |
| `app.controller.spec.ts` | 6 | 100% |
| **E2E** (`app.e2e-spec.ts`) | 14 | - |
| **E2E** (`rbac.e2e-spec.ts`) | 10 | - |

**Ejecutar tests:**
```bash
cd backend
npx jest --coverage
# 72 passed, coverage por servicio 75-100%
```

### Frontend (19 tests)

| Suite | Tests |
|-------|-------|
| `authStore.test.ts` | 4 |
| `api.test.ts` | 4 |
| `services.test.ts` | 7 |
| `navigation.test.ts` | 4 |

**Ejecutar tests:**
```bash
cd Frontend
npx vitest run
# 19 passed
```

### Bugs Corregidos durante Estabilización
- `AspectForm.tsx`: import `react-form` → `react-hook-form`
- `AspectForm.tsx`: `z.enum` con `required_error` (Zod v4) → `message`
- `tenant.middleware.ts`: header hardcodeado → usa `DEFAULT_TENANT_HEADER` del `.env`
- `users.controller.ts`: update body pasado como `{}` → `@Body() updateUserDto`
- `auth.service.ts`: logout revocaba todos los tokens del usuario → revoca solo el token presentado
- `prisma.service.ts`: `DATABASE_URL` de `process.env` directo → `ConfigService.getOrThrow()`
- `vitest.setup.ts`: mock de `localStorage` para tests de Zustand/persist en jsdom
- `sites.controller.ts`: dependencias `multer` y `@types/multer` no instaladas → instaladas
- `@Roles()` con strings literales → migrados a `Role` enum
- Duplicate route `dashboard/waste` → consolidado bajo `dashboard/environmental/waste`

---

## Estructura del Proyecto

```
SAI/
├── backend/                      # NestJS Backend
│   ├── src/
│   │   ├── common/              # Utilidades compartidas
│   │   │   ├── database/        # Prisma service
│   │   │   ├── middleware/      # Tenant middleware
│   │   │   ├── decorators/      # @Roles decorator
│   │   │   └── guards/          # RolesGuard
│   │   └── modules/
│   │       ├── auth/            # Autenticación JWT + RBAC
│   │       ├── users/           # CRUD usuarios
│   │       ├── documents/       # Gestión documental (S3/MinIO)
│   │       ├── environmental/   # Módulo ambiental ISO 14001
│   │       ├── sites/           # Sitios y certificados
│   │       ├── storage/         # StorageService (S3/MinIO + fallback)
│   │       ├── waste/           # Registro de residuos
│   │       ├── inspections/     # Inspecciones y hallazgos
│   │       ├── alerts/          # Alertas y notificaciones
│   │       ├── carbon-footprint/# Huella de carbono
│   │       └── automation/      # PDF y automatización (BullMQ)
│   ├── prisma/
│   │   └── schema.prisma        # Esquema de base de datos (28 modelos)
│   ├── docker-compose.yml       # Infraestructura local
│   ├── Dockerfile               # Imagen para producción
│   ├── DOKPLOY.md              # Guía de despliegue
│   ├── jest.config.js          # Configuración de tests
│   └── test/
│       └── app.e2e-spec.ts     # Tests e2e
│
├── Frontend/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Rutas de autenticación
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   └── dashboard/      # Rutas del dashboard
│   │   │       ├── documents/
│   │   │       ├── environmental/
│   │   │       ├── quality/      ✅
│   │   │       ├── education/    ✅
│   │   │       ├── indicators/   ✅
│   │   │       └── alerts/       ✅
│   │   ├── components/
│   │   │   ├── environmental/   # Componentes módulo ambiental
│   │   │   └── ui/            # Componentes reutilizables
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios con interceptors
│   │   │   └── services.ts     # Servicios API
│   │   ├── store/
│   │   │   ├── authStore.ts    # Zustand auth
│   │   └── store/
│   │       └── authStore.test.ts  # Tests del store
│   ├── vitest.config.ts        # Configuración de tests
│   ├── vitest.setup.ts         # Setup de tests
│   ├── Dockerfile              # Imagen para producción
│   └── package.json
│
├── README.md                    # Este archivo
├── ESTADO.md                    # Estado detallado del proyecto
├── QUICKSTART.md                # Guía de inicio rápido
├── DOKPLOY_GUIDE.md            # Guía de despliegue en Dokploy
└── docker-compose.yml           # Orchestración completa
```

---

## Cómo Empezar

### 1. Requisitos Previos
- Node.js 20+
- pnpm (`corepack enable pnpm`)
- Docker Desktop (para PostgreSQL, Redis, MinIO)

### 2. Backend

```bash
cd backend

# Instalar dependencias
pnpm install

# Generar cliente de Prisma
pnpm prisma generate

# Levantar infraestructura
docker compose up -d

# Ejecutar migraciones
pnpm prisma migrate dev --name init

# Iniciar servidor de desarrollo
pnpm start:dev

# Ejecutar tests
npx jest --coverage
```

El backend estará en `http://localhost:3001`

### 3. Frontend

```bash
cd Frontend

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Ejecutar tests
npx vitest run

# Build de producción
npx next build
```

El frontend estará en `http://localhost:3002`

### 4. Endpoints Disponibles

#### Autenticación
```
POST /api/v1/auth/register   # Registro
POST /api/v1/auth/login    # Login
POST /api/v1/auth/refresh  # Refresh token
POST /api/v1/auth/logout   # Logout (auth required)
```

#### Usuarios (Admin/Manager)
```
GET    /api/v1/users        # Listar usuarios
GET    /api/v1/users/:id    # Obtener usuario
PATCH  /api/v1/users/:id    # Actualizar usuario
DELETE /api/v1/users/:id    # Eliminar usuario
```

#### Documentos (Auth + RBAC)
```
POST   /api/v1/documents                # Crear con upload (USER+)
GET    /api/v1/documents                # Listar (todos)
GET    /api/v1/documents/:id            # Ver detalle
GET    /api/v1/documents/:id/download   # Descargar archivo
GET    /api/v1/documents/:id/download-url # URL presigned (15 min TTL)
PATCH  /api/v1/documents/:id            # Actualizar (MANAGER+)
DELETE /api/v1/documents/:id            # Eliminar (ADMIN)
POST   /api/v1/documents/:id/versions   # Agregar versión con archivo (MANAGER+)
POST   /api/v1/documents/:id/approve    # Aprobar/Rechazar (MANAGER+)
```

#### Ambiental (Auth + RBAC)
```
# Aspectos
POST   /api/v1/environmental/aspects     # Crear (MANAGER+)
GET    /api/v1/environmental/aspects     # Listar (todos)
GET    /api/v1/environmental/aspects/:id # Ver detalle
PATCH  /api/v1/environmental/aspects/:id # Actualizar (MANAGER+)
DELETE /api/v1/environmental/aspects/:id # Eliminar (ADMIN)

# PMAs
POST /api/v1/environmental/pma # Crear (MANAGER+)
GET /api/v1/environmental/pma # Listar (todos)
POST /api/v1/environmental/pma/:id/generate-pdf # Generar PDF async (MANAGER+)
GET /api/v1/environmental/pma/:id/pdf # URL presigned del PDF generado
GET /api/v1/environmental/jobs/:jobId # Estado del job BullMQ

# ANLA
POST /api/v1/environmental/anla # Crear (MANAGER+)
GET /api/v1/environmental/anla # Listar (todos)

# Residuos
POST   /api/v1/waste                   # Crear registro (USER+)
GET    /api/v1/waste                   # Listar (todos)
GET    /api/v1/waste/:id               # Ver detalle
PATCH  /api/v1/waste/:id               # Actualizar (MANAGER+)
DELETE /api/v1/waste/:id               # Eliminar (ADMIN)

# Inspecciones
POST   /api/v1/inspections             # Crear (MANAGER+)
GET    /api/v1/inspections             # Listar (todos)
GET    /api/v1/inspections/:id         # Ver detalle
PATCH  /api/v1/inspections/:id         # Actualizar (MANAGER+)
DELETE /api/v1/inspections/:id         # Eliminar (ADMIN)

# Sitios
POST   /api/v1/sites                   # Crear (MANAGER+)
GET    /api/v1/sites                   # Listar (todos)
GET    /api/v1/sites/:id               # Ver detalle
PATCH  /api/v1/sites/:id               # Actualizar (MANAGER+)
DELETE /api/v1/sites/:id               # Eliminar (ADMIN)

# Huella de Carbono
POST   /api/v1/carbon-footprint        # Crear (MANAGER+)
GET    /api/v1/carbon-footprint        # Listar (todos)
GET    /api/v1/carbon-footprint/:id    # Ver detalle
PATCH  /api/v1/carbon-footprint/:id    # Actualizar (MANAGER+)
DELETE /api/v1/carbon-footprint/:id    # Eliminar (ADMIN)

# Alertas
POST   /api/v1/alerts                  # Crear (USER+)
GET    /api/v1/alerts                  # Listar (todos)
PATCH  /api/v1/alerts/:id              # Actualizar (MANAGER+)
DELETE /api/v1/alerts/:id              # Eliminar (MANAGER+)
```

---

## Próximos Pasos

### Fase 2 - Núcleo Ambiental (Prioridad: ALTA)

1. **Huella de Carbono**
   - [ ] Microservicio FastAPI/Python
   - [ ] Cálculos Scope 1, 2, 3
   - [ ] Gráficas de tendencia

2. **Mejora de Tests**
   - [ ] Coverage de controladores y DTOs
   - [ ] Tests de integración end-to-end completos
   - [ ] Coverage target: 60% global

3. **Cronograma ANLA**
   - [ ] Alertas automáticas por email (Nodemailer)
   - [ ] Reportes exportables

### Fase 3 - App Móvil
- [ ] Flutter + API NestJS
- [ ] Offline-first (Drift/SQLite)
- [ ] Geolocalización + Cámara
- [ ] Firebase Cloud Messaging

---

## Despliegue con Dokploy

### Pasos:

1. **Crear repositorio en GitHub**
   ```bash
   git init
   git add .
   git commit -m "feat: SAI with security + tests"
   git remote add origin <tu-repo>
   git push -u origin main
   ```

2. **Configurar en Dokploy**
   - Ir a Dokploy Dashboard
   - Crear nuevo proyecto
   - Conectar repositorio GitHub
   - Seleccionar `docker-compose.yml`

3. **Configurar variables de entorno**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=<generar>
   JWT_REFRESH_SECRET=<generar>
   CORS_ORIGINS=http://localhost:3002,https://tu-dominio.com
   BCRYPT_SALT_ROUNDS=10
   ```

4. **Desplegar**
   - Push a `main` despliega automáticamente

---

## Documentación Adicional

| Documento | Ubicación |
|-----------|------------|
| **Estado del Proyecto** | `/ESTADO.md` |
| **Quickstart** | `/QUICKSTART.md` |
| **Guía Dokploy** | `/DOKPLOY_GUIDE.md` |
| **Backend** | `/backend/README.md` |
| **Frontend** | `/Frontend/README.md` |
| **Informe Técnico** | `/informe-sai.docx` |

---

## Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Acceso total al sistema |
| **MANAGER** | Gestión de usuarios, documentos, ambientales |
| **USER** | Acceso básico a documentos y métricas |
| **AUDITOR** | Solo lectura para auditorías |

---

## Multi-Tenant

Cada organización tiene:
- Datos aislados por `organizationId` en todas las consultas (tenant isolation)
- Usuarios propios
- Documentos y archivos en S3 bajo `tenants/<organizationId>/`
- Identificación por:
  - Header: `X-Tenant-ID` (configurable via `DEFAULT_TENANT_HEADER`)
  - Subdominio: `empresa.sai.co`
- `@CurrentTenant()` decorator inyecta la organización resuelta en cada controlador
- Cross-tenant access retorna `404` (no `403`) para no filtrar existencia

---

## Licencia

**Confidencial** - SAI 2026  
Elaborado por: Jaider Hernández Cardozo  
Fecha: Abril 2026

---

> ⚠️ **Nota**: El proyecto cuenta con 113 tests automatizados pasando (72 backend unitarios + 19 frontend + 22 e2e). Antes de hacer cambios importantes, ejecuta los tests para verificar que no se rompa funcionalidad existente. Los tests e2e requieren PostgreSQL y Redis corriendo (usa `docker compose up -d` en `backend/`).