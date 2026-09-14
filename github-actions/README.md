# GitHub Actions — Documentación CI/CD

Esta carpeta contiene toda la documentación necesaria para configurar los workflows de GitHub Actions del proyecto **Gestor de Suscripciones**.

## Contenido

| Documento | Propósito |
|---|---|
| [01-workflow-architecture.md](docs/01-workflow-architecture.md) | Arquitectura general, estructura de workflows, flujo completo |
| [02-ci-workflow.md](docs/02-ci-workflow.md) | Workflow de integración continua (Pull Requests) |
| [03-cd-workflow.md](docs/03-cd-workflow.md) | Workflow de despliegue (merge a main) |
| [04-rollback-workflow.md](docs/04-rollback-workflow.md) | Workflow de rollback manual |
| [05-security.md](docs/05-security.md) | Seguridad, permisos, secrets, threat model |
| [06-implementation-guide.md](docs/06-implementation-guide.md) | Guía de implementación paso a paso |
| [examples/](examples/) | Ejemplos de archivos YAML de referencia |

## Resumen Ejecutivo

El proyecto utiliza **tres workflows**:

1. **CI** (`ci.yml`): Se ejecuta en Pull Requests. Valida lint, typecheck, tests y builds.
2. **CD** (`cd.yml`): Se ejecuta al hacer merge a `main`. Despliega al homelab vía self-hosted runner.
3. **Rollback** (`rollback.yml`): Ejecución manual. Revierte a un commit específico.

### Tecnologías del proyecto

- **Monorepo**: pnpm workspaces
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **Base de datos**: PostgreSQL 15 (producción), SQLite (desarrollo)
- **Migraciones**: TypeORM (no Prisma)
- **Runtime**: Node.js 20 LTS
- **Gestor de paquetes**: pnpm 9

### Arquitectura de connectivity

```
GitHub Actions (CI)  ──→  GitHub-hosted runner (ubuntu-latest)
                              │
                              └── Validación de código

GitHub Actions (CD)  ──→  Self-hosted runner (LXC dedicado, red local)
                              │
                              └── SSH ──→ LXC 112 (producción)
                                              ├── PostgreSQL 15
                                              ├── PM2 (NestJS)
                                              └── Nginx (React)
```

## Archivos que se crearán en el repositorio

```
.github/
└── workflows/
    ├── ci.yml
    ├── cd.yml
    └── rollback.yml

scripts/
├── deploy.sh
├── rollback.sh
└── health-check.sh
```

## Requisitos previos

Antes de implementar estos workflows se necesita:

1. Self-hosted runner instalado y registrado (ver `self-hosted-runner/`).
2. Usuario `deploy` creado en LXC 112 con permisos sudoers.
3. SSH key configurada entre el runner y LXC 112.
4. Secrets de GitHub configurados (ver `05-security.md`).
5. Environment `production` creado en GitHub.
6. Branch protection habilitada en `main`.
