## Memories - SAI (Actualizado Abril 15, 2026)

### Stack y Puertos
- Proyecto SAI - Sistema Ambiental Integrado
- Backend: NestJS 11 + Prisma v7.7.0 (driver adapter @prisma/adapter-pg + pg)
- DB: PostgreSQL 16, esquema en backend/prisma/schema.prisma (15+ modelos)
- Infraestructura: Redis 7, MinIO (S3), PostgreSQL
- Dockerfile backend: pnpm prisma migrate deploy && node dist/main.js
- docker-compose.yml en raíz del proyecto
- Despliegue: Dokploy en WSL (Ubuntu). Git repo: github.com/alcaniius/-SAI-
- Prisma v7: requiere driver adapter (PrismaPg), NO permite url directa en schema.prisma
- Multi-tenant (schema-per-organization)
- Puerto backend: 3001, Frontend: 3002, MinIO: 9000/9001
- Trabaja en Windows (C:\DEV\SAI) pero despliega en WSL

### Estado del Frontend (Fase 1 - COMPLETO + TESTS)
- Frontend corre en http://localhost:3002 con `pnpm dev`
- Rutas correctas:
  - /login → página de login
  - /register → página de registro
  - /dashboard → dashboard principal (con sidebar)
  - /dashboard/documents → gestión documental
- Carpeta de rutas: Frontend/src/app/dashboard/
- Tests: 12 tests pasando (vitest + @testing-library)

### Estado del Backend (Fase 1 - COMPLETO + SEGURIDAD + TESTS)
- Backend corriendo en http://localhost:3001
- Conectado a PostgreSQL
- ORM (Prisma) actualizado y migraciones ejecutadas
- Módulo `environmental` operacional

### Seguridad Implementada (Abril 15, 2026)
- Helmet: security headers (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
- Rate Limiting: @nestjs/throttler (3 perfiles: short 3/s, medium 20/10s, long 100/min)
- CORS dinámico: desde CORS_ORIGINS env var
- RBAC: RolesGuard + @Roles() en documents, environmental, users
- Fix: self-role-assignment → registro siempre crea USER
- Fix: users.update ahora pasa @Body() correctamente
- Fix: tenant middleware usa DEFAULT_TENANT_HEADER del env

### Testing (Abril 15, 2026)
- Backend: 42 tests unitarios + 14 e2e = 56 tests pasando
- Frontend: 12 tests pasando
- Total: 68 tests automatizados
- Coverage backend: 33% global, servicios 97-100%
- Mock de Prisma: prisma.service.mock.ts

### Siguiente paso
- Desplegar en Dokploy con variables de entorno configuradas
- Probar flujo completo: registro → login → documentos → ambiental
- Ejecutar tests antes de cada deployment: `npx jest --coverage && npx vitest run`