# 01 — Arquitectura de Workflows

## Visión General

El sistema CI/CD se compone de tres workflows independientes, cada uno con un propósito claro y un conjunto definido de triggers.

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                                                                 │
│  Pull Request ──→ ci.yml ──→ Validación de código               │
│                                                                 │
│  Merge a main ──→ cd.yml ──→ Despliegue a producción            │
│                                                                 │
│  Manual ────────→ rollback.yml ──→ Revertir a commit específico │
└─────────────────────────────────────────────────────────────────┘
```

## Estructura de Archivos

```
.github/
└── workflows/
    ├── ci.yml           # Integración continua
    ├── cd.yml           # Despliegue continuo
    └── rollback.yml     # Rollback manual

scripts/
├── deploy.sh            # Script de despliegue (ejecutado en LXC 112)
├── rollback.sh          # Script de rollback (ejecutado en LXC 112)
└── health-check.sh      # Verificación post-deploy
```

### Por qué los scripts están en el repo y no en el workflow

La lógica de despliegue vive en `scripts/` dentro del repositorio, no en los archivos YAML de GitHub Actions. Las razones:

1. **Versionado**: Los scripts se versionan junto con el código.
2. **Revisión**: Se pueden revisar en PRs antes de que affecten producción.
3. **Reutilización**: Se pueden ejecutar manualmente desde el servidor.
4. **Mantenibilidad**: Editar un `.sh` es más simple que editar un YAML con multiline strings.
5. **Testing**: Se pueden probar localmente antes de usar en CI.

El workflow YAML solo orquesta: llama al script vía SSH y verifica el resultado.

## Triggers

### ci.yml

```yaml
on:
  pull_request:
    branches: [main]
```

- Se ejecuta **únicamente** en PRs hacia `main`.
- No se ejecuta en pushes directos a branches feature.
- Usa `concurrency` para cancelar ejecuciones previas del mismo PR.

### cd.yml

```yaml
on:
  push:
    branches: [main]
```

- Se ejecuta **únicamente** cuando se hace merge (o push) a `main`.
- Nunca se ejecuta en PRs.
- Usa `concurrency` con `cancel-in-progress: false` para no interrumpir deploys en curso.

### rollback.yml

```yaml
on:
  workflow_dispatch:
    inputs:
      commit:
        description: 'Commit hash or tag to rollback to'
        required: true
        type: string
```

- Solo se ejecuta **manualmente** desde la UI de GitHub Actions.
- Requiere introducir el commit hash al que se quiere volver.
- Solo disponible para usuarios con permiso `actions: write`.

## Jobs y Dependencias

### CI — Dependencias entre jobs

```
detect-changes
    │
    ├──→ backend-lint ──────┐
    ├──→ backend-typecheck ──┤
    ├──→ backend-test ───────┤──→ backend-build
    │                        │
    ├──→ frontend-typecheck ─┤──→ frontend-build
    │                        │
    └──→ ci-summary (always)
```

**`detect-changes`**: Usa `dorny/paths-filter` para determinar qué apps cambiaron. Los jobs de backend solo se ejecutan si hay cambios en `apps/backend/`, y viceversa.

**`ci-summary`**: Job final que siempre se ejecuta (`if: always()`). Evalúa el resultado de todos los jobs anteriores y falla si cualquiera falló. Esto es necesario para que branch protection puedarequerir un solo check.

### CD — Jobs

```
deploy (self-hosted, environment: production)
    ├── Validate environment
    ├── Setup SSH
    ├── Pre-deploy check
    ├── Deploy (ssh → deploy.sh)
    ├── Health check
    └── Cleanup SSH key (always)
```

Un solo job secuencial. No hay paralelismo porque el despliegue es una operación secuencial en un solo servidor.

### Rollback — Jobs

```
rollback (self-hosted, environment: production)
    ├── Validate input
    ├── Setup SSH
    ├── Execute rollback (ssh → rollback.sh)
    ├── Health check
    └── Cleanup SSH key (always)
```

## Concurrency Groups

```yaml
# CI: cancel in-progress for same PR
concurrency:
  group: ci-${{ github.head_ref }}
  cancel-in-progress: true

# CD: never cancel deploys in progress
concurrency:
  group: cd-production
  cancel-in-progress: false
```

**Por qué**: En CI, si se hace push a un PR mientras ya hay un build corriendo, se cancela el anterior (ahorra minutos de runner). En CD, nunca se cancela un deploy en curso porque podría dejar el servidor en un estado intermedio.

## Uso del Self-Hosted Runner

### En CI

CI **no usa** el self-hosted runner. Usa `ubuntu-latest` (GitHub-hosted). Razones:

- CI es solo validación de código, no necesita acceso al homelab.
- GitHub-hosted runners son gratis para repos públicos.
- Menor superficie de ataque: workflows de PR no tocan producción.

### En CD y Rollback

```yaml
jobs:
  deploy:
    runs-on: self-hosted
    environment: production
```

- **`runs-on: self-hosted`**: Ejecuta en el runner registrado en el homelab.
- **`environment: production`**: Activa las protection rules configuradas (required reviewers, wait timer).

### Restricción de forks

Los workflows de CD y rollback **nunca** se ejecutan en forks porque:

1. `cd.yml` solo se activa con `push` a `main`, y los forks no tienen push al repo original.
2. `rollback.yml` requiere `workflow_dispatch`, que no está disponible en forks por defecto.
3. El environment `production` tiene required reviewers que no existen en forks.

## Estrategia de Branches

```
main ──────────────────────────────────→ Producción
  │
  ├── feature/xxx ──→ PR ──→ CI ──→ Merge a main ──→ CD
  ├── fix/xxx ──────→ PR ──→ CI ──→ Merge a main ──→ CD
  └── hotfix/xxx ───→ PR ──→ CI ──→ Merge a main ──→ CD
```

- **Solo `main`** recibe deploys a producción.
- Todos los cambios pasan por PR con CI obligatorio.
- No hay branches de desarrollo/staging adicionales (innecesario para un homelab con un solo entorno).

## Manejo de Errores en el Pipeline

### CI

Si cualquier job de CI falla:
- El PR no se puede merge (branch protection lo bloquea).
- El desarrollador ve qué específicofalló (lint, typecheck, test o build).
- No hay impacto en producción.

### CD

Si el deploy falla:
- El workflow marca como `failure`.
- GitHub envía notificación por email.
- El health check post-deploy detecta si la app quedó caída.
- Se puede ejecutar `rollback.yml` manualmente.

### Rollback

Si el rollback falla:
- El workflow marca como `failure`.
- Se requiere intervención manual directa en el servidor.
- Este es el escenario de mayor riesgo y menos probable.
