# 03 — CD Workflow (Despliegue)

## Propósito

Desplegar automáticamente los cambios aprobados que llegan a `main` en el LXC 112 del homelab.

## Trigger

```yaml
on:
  push:
    branches: [main]
```

Se ejecuta **únicamente** cuando se hace push o merge a `main`. No se ejecuta en PRs, no se ejecuta en otros branches.

## Runner

```yaml
jobs:
  deploy:
    runs-on: self-hosted
```

Este workflow se ejecuta en el **self-hosted runner** instalado en el homelab, no en un runner de GitHub. Razones:

1. El runner necesita acceso SSH al LXC 112 (red local).
2. GitHub-hosted runners no tienen acceso a tu red local.
3. Mantener las credenciales de SSH solo en el homelab reduce la superficie de ataque.

## Environment

```yaml
jobs:
  deploy:
    environment: production
```

El environment `production` tiene protection rules configuradas en GitHub:

- **Required reviewers**: Al menos un usuario debe aprobar el deploy.
- **Wait timer**: Opcional, 0-5 minutos para cancelar si se detecta un problema.
- **Deployment branches**: Solo `main`.

**Por qué un environment**: Es la barrera entre "el código pasó CI" y "el código llega a producción". Incluso después de merge, un deploy puede requerir aprobación manual.

## Jobs

### deploy (único job)

El CD usa un solo job secuencial porque el despliegue es una operación atómica en un solo servidor. No hay paralelismo posible ni deseable.

#### Paso 1: Validate environment

```bash
if [ -z "${{ secrets.DEPLOY_HOST }}" ]; then
  echo "ERROR: DEPLOY_HOST secret not configured"
  exit 1
fi
```

Verifica que los secrets estén configurados antes de intentar cualquier operación. Evita errores crípticos mitad del deploy.

#### Paso 2: Setup SSH

```bash
mkdir -p ~/.ssh
echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key
ssh-keyscan -H "${{ secrets.DEPLOY_HOST }}" >> ~/.ssh/known_hosts
```

- Crea la key SSH temporalmente.
- `chmod 600`: Requerido por SSH (key no legible por otros usuarios).
- `ssh-keyscan`: Agrega el host a known_hosts para evitar prompts de confirmación.

#### Paso 3: Pre-deploy check

```bash
ssh -i ~/.ssh/deploy_key \
  -o StrictHostKeyChecking=yes \
  "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
  "echo 'SSH connection OK'"
```

Verifica que la conexión SSH funciona antes de ejecutar el deploy. Si falla aquí, el deploy no continúa.

#### Paso 4: Deploy

```bash
ssh -i ~/.ssh/deploy_key \
  -o StrictHostKeyChecking=yes \
  "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
  "cd ${{ vars.APP_PATH }} && bash scripts/deploy.sh"
```

Ejecuta `scripts/deploy.sh` en el LXC 112. El script:
1. Hace pull del código.
2. Instala dependencias.
3. Ejecuta migraciones si las hay.
4. Reinicia PM2 y Nginx.
5. Ejecuta health checks.

**El workflow NO conoce los detalles del deploy.** Solo llama al script y verifica el exit code.

#### Paso 5: Post-deploy health check

```bash
sleep 10
HEALTH=$(ssh ... "curl -sf http://localhost:3000/health")
if echo "$HEALTH" | grep -q '"status":"OK"'; then
  echo "Health check passed"
else
  exit 1
fi
```

Verificación externa del health check. Aunque `deploy.sh` ya tiene su propio health check, esta verificación es independiente y desde la perspectiva del runner.

#### Paso 6: Cleanup SSH key

```yaml
- name: Cleanup SSH key
  if: always()
  run: rm -f ~/.ssh/deploy_key
```

`if: always()` asegura que la key se limpie tanto si el deploy fue exitoso como si falló. Nunca debe quedar una SSH key temporal en el runner.

## Secrets Requeridos

| Secret | Propósito | Ejemplo |
|---|---|---|
| `DEPLOY_SSH_KEY` | Private key SSH para autenticación | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_HOST` | IP o hostname del LXC 112 | `your_server_ip_here` |
| `DEPLOY_USER` | Usuario SSH en el LXC 112 | `deploy` |

## Variables Requeridas

| Variable | Propósito | Ejemplo |
|---|---|---|
| `APP_PATH` | Ruta de la app en el servidor | `/opt/gestor-suscripciones` |

## Concurrency

```yaml
concurrency:
  group: cd-production
  cancel-in-progress: false
```

**`cancel-in-progress: false`**: Nunca cancelar un deploy en curso. Si se hace push a `main` mientras ya hay un deploy ejecutándose, el nuevo espera a que termine el anterior. Esto evita que dos deploys se ejecuten simultáneamente y dejen el servidor en un estado intermedio.

## Manejo de Fallos

Si el deploy falla en cualquier paso:

1. El workflow se marca como `failure`.
2. GitHub envía una notificación por email al último committer.
3. El health check post-deploy puede detectar si la app quedó caída.
4. Se debe ejecutar `rollback.yml` manualmente o hacer `ssh` al servidor y ejecutar `scripts/rollback.sh`.

**No hay rollback automático.** Razón: una migración de base de datos exitosa que dejó datos nuevos no puede revertirse automáticamente sin riesgo de pérdida de datos. El rollback debe ser una decisión humana informada.

## Health Checks

### Backend

```bash
curl -sf http://localhost:3000/health
# Respuesta esperada: {"status":"OK","timestamp":"...","service":"Gestión de Suscripciones","version":"1.0.0"}
```

El endpoint `/health` está definido en `apps/backend/src/app.controller.ts`. Retorna `200` con status `OK` si la app está funcionando.

### Frontend

```bash
curl -sf -o /dev/null -w "%{http_code}" http://localhost:80
# Respuesta esperada: 200
```

Verifica que Nginx está sirviendo los archivos estáticos del frontend.

### PostgreSQL

```bash
sudo -u postgres psql -c "SELECT 1;"
```

Verificación de que PostgreSQL está accesible. Esto se ejecuta dentro de `deploy.sh`, no desde el workflow.

## Diferencia entre CI y CD

| Aspecto | CI | CD |
|---|---|---|
| Trigger | Pull Request | Push a main |
| Runner | GitHub-hosted | Self-hosted |
| Acceso a homelab | No | Sí (SSH) |
| Puede modificar producción | No | Sí |
| Requiere aprobación | No (automático) | Sí (environment protection) |
| Secrets necesarios | Ninguno | DEPLOY_SSH_KEY, DEPLOY_HOST, DEPLOY_USER |

## Ejemplo Completo del Workflow

Ver [examples/cd.yml](../examples/cd.yml).
