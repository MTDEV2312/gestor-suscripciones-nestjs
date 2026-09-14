# 04 — Rollback Workflow

## Propósito

Permitir revertir la aplicación a un commit o tag específico de forma controlada, con health checks posteriores.

## Trigger

```yaml
on:
  workflow_dispatch:
    inputs:
      commit:
        description: 'Commit hash or tag to rollback to'
        required: true
        type: string
      skip_migrations:
        description: 'Skip database rollback'
        required: false
        type: boolean
        default: false
```

**`workflow_dispatch`**: Solo se ejecuta manualmente desde la pestaña Actions de GitHub. No se activa por ningún evento automático.

**Inputs**:
- `commit` (requerido): Hash del commit o tag al que se quiere volver.
- `skip_migrations` (opcional): Si se marca, el rollback solo revierte el código, no la base de datos. Útil cuando las migraciones son backward-compatible.

## Runner

```yaml
jobs:
  rollback:
    runs-on: self-hosted
    environment: production
```

Mismo self-hosted runner que CD. Mismo environment con protection rules.

## Por qué el Rollback es Manual

El rollback es la excepción a la automatización por estas razones:

1. **Migraciones de base de datos**: Si una migración ya se ejecutó y creó datos nuevos, revertirla puede causar pérdida de datos. Esto requiere análisis humano.
2. **Decisión informada**: Antes de rollback, alguien debe evaluar: ¿el problema es el código o la migración?
3. **Rollback parcial**: A veces solo hay que revertir código, otras veces hay que restaurar la base de datos. Ambos escenarios requieren decisión humana.

## Flujo del Rollback

```
1. Usuario ejecuta workflow desde GitHub UI
   │
   ▼
2. Valida input (commit hash válido)
   │
   ▼
3. Setup SSH (misma lógica que CD)
   │
   ▼
4. Ejecuta scripts/rollback.sh <commit>
   │   ├── git checkout <commit>
   │   ├── pnpm install --frozen-lockfile
   │   ├── pnpm build
   │   ├── pm2 restart
   │   └── systemctl reload nginx
   │
   ▼
5. Health check post-rollback
   │
   ▼
6. Cleanup SSH key
```

## Scripts Relacionados

El workflow ejecuta `scripts/rollback.sh` en el servidor. Este script:

1. Verifica que el commit existe.
2. Hace `git checkout` al commit especificado.
3. Instala dependencias con `--frozen-lockfile`.
4. Compila backend y frontend.
5. Reinicia PM2 y recarga Nginx.
6. Ejecuta health checks con reintentos.

## Rollback de Código vs Rollback de Base de Datos

### Rollback de código (sin migración)

Cuando el problema es solo el código (bug en la lógica, build roto, etc.) y no hubo migraciones:

```bash
# El script ejecuta:
git checkout <commit-anterior>
pnpm install --frozen-lockfile
pnpm build
pm2 restart
```

Esto es seguro y rápido. No hay riesgo de pérdida de datos.

### Rollback con restauración de backup

Cuando una migración falló o dejó la app en un estado inválido:

1. Restaurar backup de la base de datos.
2. Revertir el código al commit anterior.
3. Reiniciar servicios.

**Este escenario NO está automatizado en el workflow.** Requiere intervención manual:

```bash
# SSH al LXC 112
cd /opt/gestor-suscripciones

# Restaurar backup
sudo -u postgres psql gestor_suscripciones < /opt/gestor-suscripciones-backups/db_before_deploy_YYYYMMDD_HHMMSS.sql

# Revertir código
git checkout <commit-anterior>
pnpm install --frozen-lockfile
pnpm build
sudo pm2 restart gestor-suscripciones-backend --update-env
sudo systemctl reload nginx
```

### Rollback irreversible

Si una migración ejecutó `DROP COLUMN` o `DELETE FROM` y ya hay datos nuevos que dependen del schema anterior, **no existe rollback automático posible**. En este caso:

1. Restaurar el backup de la base de datos.
2. Revertir el código.
3. **Perder los datos que se ingresaron después de la migración.**

Por esto las migraciones deben ser backward-compatible (ver `05-security.md`).

## Tags y Releases

Una buena práctica para facilitar rollbacks:

```bash
# Después de un deploy exitoso, crear un tag
git tag -a v1.2.3 -m "Deployed to production"
git push origin v1.2.3
```

Con tags, el rollback se puede hacer por nombre en vez de por hash:

```yaml
inputs:
  commit:
    description: 'Tag or commit hash (e.g. v1.2.3 or abc1234)'
```

## Ejemplo Completo del Workflow

Ver [examples/rollback.yml](../examples/rollback.yml).
