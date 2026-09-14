# 06 — Guía de Implementación (GitHub Actions)

Esta guía documenta el proceso paso a paso para implementar los workflows de GitHub Actions en el proyecto. Cada paso incluye qué hacer, dónde hacerlo y cómo verificarlo.

## Prerequisitos

Antes de empezar, se necesita:

1. Self-hosted runner instalado y registrado (ver `self-hosted-runner/`).
2. Usuario `deploy` creado en LXC 112.
3. SSH key configurada entre el runner y LXC 112.
4. Acceso admin al repositorio en GitHub.

## Fase 1: Configurar el Repositorio

### 1.1 Habilitar Branch Protection

**Dónde**: GitHub > Settings > Branches > Add rule

**Configuración**:
```
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  (Los checks se agregarán después de crear los workflows)

✅ Require branches to be up to date before merging

✅ Do not allow bypassing the above settings

✅ Restrict who can push to matching branches
  → Seleccionar tu usuario
```

**Verificación**: Intentar hacer push directo a main debe fallar.

### 1.2 Configurar Workflow Permissions

**Dónde**: GitHub > Settings > Actions > General

**Configuración**:
```
Workflow permissions:
  ✅ Read repository contents and packages permissions

Allow GitHub Actions to create and approve pull requests:
  ❌ Desactivado
```

### 1.3 Crear Environment de Producción

**Dónde**: GitHub > Environments > New environment

**Configuración**:
```
Name: production

✅ Required reviewers
  → Agregar tu usuario

✅ Wait timer: 0 minutes

Deployment branches:
  ✅ Selected branches
  → Add: main
```

### 1.4 Configurar Secrets

**Dónde**: GitHub > Settings > Secrets and variables > Actions > New repository secret

**Secrets a crear**:

| Nombre | Valor | Notas |
|---|---|---|
| `DEPLOY_SSH_KEY` | Private key completa | Incluir `BEGIN` y `END` |
| `DEPLOY_HOST` | IP del LXC 112 | Ej: `your_server_ip_here` |
| `DEPLOY_USER` | `deploy` | Usuario dedicado |

### 1.5 Configurar Variables

**Dónde**: GitHub > Settings > Secrets and variables > Actions > Variables tab > New repository variable

**Variables a crear**:

| Nombre | Value |
|---|---|
| `APP_PATH` | `/opt/gestor-suscripciones` |

## Fase 2: Crear los Scripts de Deploy

### 2.1 Crear `scripts/deploy.sh`

**Dónde**: En la raíz del repositorio, crear `scripts/deploy.sh`

**Contenido**: Ver ejemplos en `github-actions/examples/` o la sección de scripts de esta documentación.

**Permisos**: `chmod +x scripts/deploy.sh`

**Verificación**: Ejecutar manualmente desde LXC 112 como usuario `deploy`:
```bash
cd /opt/gestor-suscripciones
bash scripts/deploy.sh
```

### 2.2 Crear `scripts/rollback.sh`

**Dónde**: En la raíz del repositorio, crear `scripts/rollback.sh`

**Contenido**: Ver ejemplos en `github-actions/examples/`.

**Permisos**: `chmod +x scripts/rollback.sh`

### 2.3 Crear `scripts/health-check.sh`

**Dónde**: En la raíz del repositorio, crear `scripts/health-check.sh`

**Contenido**: Ver ejemplos en `github-actions/examples/`.

### 2.4 Commit y Push

```bash
git add scripts/
git commit -m "ci: add deployment scripts"
git push origin main
```

**Verificación**: Los scripts aparecen en el repositorio y son ejecutables.

## Fase 3: Crear los Workflows

### 3.1 Crear CI Workflow

**Dónde**: En el repositorio, crear `.github/workflows/ci.yml`

**Contenido**: Ver `github-actions/examples/ci.yml`.

### 3.2 Crear CD Workflow

**Dónde**: En el repositorio, crear `.github/workflows/cd.yml`

**Contenido**: Ver `github-actions/examples/cd.yml`.

### 3.3 Crear Rollback Workflow

**Dónde**: En el repositorio, crear `.github/workflows/rollback.yml`

**Contenido**: Ver `github-actions/examples/rollback.yml`.

### 3.4 Commit y Push

```bash
git add .github/ scripts/
git commit -m "ci: add GitHub Actions workflows"
git push origin feature/ci-cd-setup
```

**IMPORTANTE**: No hacer push directo a main. Crear un PR para que los workflows se validen.

### 3.5 Crear PR y Verificar

1. Abrir PR desde `feature/ci-cd-setup` hacia `main`.
2. Verificar que CI se ejecuta automáticamente.
3. Verificar que todos los jobs pasan.
4. Revisar los logs de cada job.
5. Merge el PR.

**Verificación**:
- Después del merge, verificar en la pestaña Actions que CD se activó.
- Verificar que el deploy se ejecutó correctamente.
- Verificar que la app funciona en producción.

## Fase 4: Verificar la Configuración

### 4.1 Verificar Branch Protection

```bash
# Intentar push directo a main (debe fallar)
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: verify branch protection"
git push origin main
# Debe fallar con error de branch protection
```

### 4.2 Verificar CI en PR

```bash
# Crear un PR trivial
git checkout -b test/ci-verification
echo "# CI Test" >> CI_TEST.md
git add CI_TEST.md
git commit -m "test: verify CI pipeline"
git push origin test/ci-verification
```

1. Abrir el PR en GitHub.
2. Verificar que CI se ejecuta.
3. Verificar que todos los jobs pasan.
4. Cerrar el PR sin merge.

### 4.3 Verificar CD en Merge

1. Merge un PR trivial a main.
2. Verificar que CD se ejecuta.
3. Verificar que el deploy funciona.
4. Verificar que la app responde.

### 4.4 Verificar Rollback

1. Ir a Actions > Rollback > Run workflow.
2. Introducir un commit hash conocido.
3. Verificar que el rollback se ejecuta.
4. Verificar que la app responde.

## Fase 5: Hardening

### 5.1 Revisar Secrets

1. Verificar que los secrets no aparecen en logs de workflows.
2. Verificar que los secrets no están en el repositorio.
3. Verificar que los secrets tienen la menor información posible.

### 5.2 Revisar Permisos

1. Verificar que `GITHUB_TOKEN` solo tiene `contents: read`.
2. Verificar que el environment `production` tiene required reviewers.
3. Verificar que la branch protection está activa.

### 5.3 Documentar

1. Actualizar el README del proyecto con la información de CI/CD.
2. Documentar cómo ejecutar rollbacks.
3. Documentar cómo rotar secrets.

## Checklist de Implementación

```
Repositorio:
  [ ] Branch protection habilitada en main
  [ ] Workflow permissions en "Read only"
  [ ] Environment "production" creado con required reviewers
  [ ] Secrets configurados (DEPLOY_SSH_KEY, DEPLOY_HOST, DEPLOY_USER)
  [ ] Variable APP_PATH configurada
  [ ] scripts/deploy.sh creado y ejecutable
  [ ] scripts/rollback.sh creado y ejecutable
  [ ] .github/workflows/ci.yml creado
  [ ] .github/workflows/cd.yml creado
  [ ] .github/workflows/rollback.yml creado

Verificación:
  [ ] CI se ejecuta en PRs
  [ ] CI valida lint, typecheck, tests y builds
  [ ] CD se ejecuta al merge a main
  [ ] Deploy funciona end-to-end
  [ ] Health check post-deploy pasa
  [ ] Rollback funciona
  [ ] Rollback health check pasa
  [ ] Push directo a main está bloqueado
  [ ] Secrets no aparecen en logs
```

## Troubleshooting

### CI no se ejecuta en el PR

- Verificar que el archivo `.github/workflows/ci.yml` existe en la branch del PR.
- Verificar que la sintaxis YAML es válida.
- Verificar en Actions > Actions del repositorio si hay errores.

### CD no se ejecuta al merge

- Verificar que el merge fue a `main`.
- Verificar que el environment `production` existe.
- Verificar que el self-hosted runner está online (Settings > Actions > Runners).

### Deploy falla con error de SSH

- Verificar que el secret `DEPLOY_SSH_KEY` es la private key correcta.
- Verificar que `DEPLOY_HOST` es la IP correcta.
- Verificar que el usuario `deploy` existe en LXC 112.
- Verificar que la SSH key pública está en `~deploy/.ssh/authorized_keys`.

### Deploy falla con error de permisos

- Verificar que el usuario `deploy` tiene permisos en `/opt/gestor-suscripciones`.
- Verificar que el sudoers está configurado correctamente.
- Verificar que PM2 y Nginx son accesibles via sudo.

### Health check falla post-deploy

- SSH al LXC 112 y verificar manualmente: `curl http://localhost:3000/health`.
- Verificar logs de PM2: `pm2 logs gestor-suscripciones-backend`.
- Verificar que PostgreSQL está corriendo: `sudo systemctl status postgresql`.
