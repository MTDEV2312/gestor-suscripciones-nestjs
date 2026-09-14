# 02 — CI Workflow (Pull Requests)

## Propósito

Validar que el código introducido en un Pull Request no rompe nada: que compila, pasa linting, pasa tests y no tiene errores de tipo.

## Trigger

```yaml
on:
  pull_request:
    branches: [main]
```

Se ejecuta cuando:
- Se abre un PR hacia `main`.
- Se hace push a un PR existente hacia `main`.

No se ejecuta cuando:
- Se hace push a un branch directamente (sin PR).
- Se hace merge a `main` (eso dispara `cd.yml`).

## Permisos

```yaml
permissions:
  contents: read
```

Solo necesita leer el código. No necesita escribir, descargar artifacts ni nada más. Esto cumple el principio de mínimo privilegio.

## Jobs

### 1. detect-changes

**Propósito**: Determinar qué partes del monorepo cambiaron para evitar ejecutar checks innecesarios.

**Runner**: `ubuntu-latest` (GitHub-hosted)

**Herramienta**: `dorny/paths-filter@v3`

**Lógica**:
```yaml
filters: |
  backend:
    - 'apps/backend/**'
    - 'pnpm-lock.yaml'
    - 'pnpm-workspace.yaml'
  frontend:
    - 'apps/frontend/**'
    - 'pnpm-lock.yaml'
    - 'pnpm-workspace.yaml'
```

**Outputs**: `backend` y `frontend` como strings `"true"` o `"false"`.

**Por qué es importante**: En un monorepo, si solo cambiaste el frontend, no tiene sentido compilar y testear el backend (y viceversa). Esto reduce el tiempo de CI significativamente.

### 2. backend-lint

**Condición**: Solo si `detect-changes.outputs.backend == 'true'`

**Runner**: `ubuntu-latest`

**Working directory**: `apps/backend`

**Pasos**:
1. Checkout del código.
2. Instalar pnpm 9.
3. Configurar Node.js 20 con caché de pnpm.
4. `pnpm install --frozen-lockfile`
5. `pnpm lint`

**Nota**: El linting usa ESLint con TypeScript checking y Prettier. El frontend actualmente no tiene script de lint, por lo que este job solo aplica al backend.

### 3. backend-typecheck

**Condición**: Solo si backend cambió

**Pasos**:
1. Checkout + pnpm + Node.js.
2. `pnpm install --frozen-lockfile`
3. `npx tsc --noEmit`

**Por qué separado de lint**: Typecheck y lint son validaciones independientes. Si falla typecheck, no tiene sentido esperar a que termine lint (y viceversa). Correr en paralelo da feedback más rápido.

### 4. backend-test

**Condición**: Solo si backend cambió

**Pasos**:
1. Checkout + pnpm + Node.js.
2. `pnpm install --frozen-lockfile`
3. `pnpm test -- --passWithNoTests --forceExit`

**Parámetros importantes**:
- `--passWithNoTests`: No falla si no hay tests (aunque el proyecto tiene 16 spec files).
- `--forceExit`: Jest se cierra aunque haya handles abiertos (necesario con TypeORM/SQLite).

**Tipo de tests**: Unitarios únicamente. Los tests e2e requieren PostgreSQL y no se ejecutan en CI (ver sección de e2e más abajo).

### 5. backend-build

**Condición**: Solo si backend cambió **Y** lint + typecheck + test pasaron

**Dependencias**: `needs: [detect-changes, backend-lint, backend-typecheck, backend-test]`

**Pasos**:
1. Checkout + pnpm + Node.js.
2. `pnpm install --frozen-lockfile`
3. `pnpm build:backend`

**Por qué depende de los otros jobs**: No tiene sentido compilar si el código no pasa lint, typecheck o tests. Esto ahorra tiempo de build innecesario.

### 6. frontend-typecheck

**Condición**: Solo si frontend cambió

**Pasos**:
1. Checkout + pnpm + Node.js.
2. `pnpm install --frozen-lockfile`
3. `npx tsc --noEmit` (desde `apps/frontend`)

### 7. frontend-build

**Condición**: Solo si frontend cambió **Y** typecheck pasó

**Dependencias**: `needs: [detect-changes, frontend-typecheck]`

**Pasos**:
1. Checkout + pnpm + Node.js.
2. `pnpm install --frozen-lockfile`
3. `pnpm build:frontend`

### 8. ci-summary

**Condición**: `if: always()` — siempre se ejecuta

**Propósito**: Evaluar el resultado colectivo de todos los jobs y reportar si el CI pasó o falló.

**Por qué existe**: Branch protection requiere que los checks pasen. Si un job se skipea (porque no hubo cambios en esa parte), no debe contar como falla. Este job evalúa solo los jobs que realmente se ejecutaron.

**Lógica**:
```bash
if [[ "${{ needs.backend-lint.result }}" == "failure" ]] || \
   [[ "${{ needs.backend-build.result }}" == "failure" ]] || ...; then
  exit 1
fi
```

## Instalación Reproducible de Dependencias

Cada job ejecuta:
```bash
pnpm install --frozen-lockfile
```

**`--frozen-lockfile`** es crítico: asegura que se instalen exactamente las versiones del `pnpm-lock.yaml`, sin modificarlo. Si el lockfile está desactualizado, el install falla. Esto garantiza que CI usa las mismas dependencias que producción.

## Type Checking

El proyecto tiene TypeScript configurado en ambos apps:

- **Backend**: `tsconfig.json` con `strictNullChecks: true`, `noImplicitAny: false`
- **Frontend**: `tsconfig.json` con `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`

El typecheck se ejecuta con `npx tsc --noEmit` (solo verifica, no genera archivos).

## Tests E2E — Por qué NO se ejecutan en CI

Los tests e2e (`apps/backend/test/app.e2e-spec.ts`):

1. Crean un usuario real en la base de datos.
2. Ejecutan login, CRUD de suscripciones, dashboard, y eliminación de cuenta.
3. Requieren una instancia de PostgreSQL funcional.
4. Modifican datos (no son idempotentes).

**Problemas si se ejecutaran en CI**:
- GitHub-hosted runners no tienen PostgreSQL instalado por defecto.
- Configurar PostgreSQL en CI agrega complejidad y tiempo.
- Los tests crean/destruyen datos — no son adecuados para CI paralelo.
- Si el test falla a medio camino, deja datos residuales.

**Recomendación**: Los e2e se ejecutan localmente antes de abrir el PR, o se ejecutan contra una instancia de staging. No pertenecen al CI pipeline básico.

## Estrategia de Caché

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
```

`actions/setup-node` con `cache: pnpm` almacena el caché de pnpm entre ejecuciones. Esto reduce el tiempo de `pnpm install` de ~60s a ~10s en ejecuciones subsecuentes.

## Tiempo Estimado por Job

| Job | Tiempo estimado |
|---|---|
| detect-changes | ~5s |
| backend-lint | ~30s |
| backend-typecheck | ~25s |
| backend-test | ~40s |
| backend-build | ~30s |
| frontend-typecheck | ~15s |
| frontend-build | ~20s |
| **Total (ambos apps)** | **~2 min** |
| **Total (solo backend)** | **~1.5 min** |
| **Total (solo frontend)** | **~40s** |

## Ejemplo Completo del Workflow

Ver [examples/ci.yml](../examples/ci.yml).
