# Arquitectura de Despliegue GitOps: Gestor de Suscripciones (Monorepo) + GHCR

Esta guía detalla la implementación de un pipeline seguro y desacoplado para el **Gestor de Suscripciones (`gestor-suscripciones-monorepo`)**, migrando del despliegue imperativo por PM2/SSH a un modelo **GitOps (Pull)** utilizando **GitHub Container Registry (GHCR)** y **Docker Compose**.

---

## 1. Justificación Arquitectónica

```
[ Push / PR en GitHub ]
       │
       ▼
[ GitHub Cloud Runner (ubuntu-latest) ] ── (Gratis e ilimitado para repos públicos)
       ├─ Lint & Typecheck (Monorepo pnpm)
       ├─ Tests Unitarios (Backend)
       ├─ Docker Build Backend (NestJS)
       ├─ Docker Build Frontend (Vite + Nginx)
       └─ Push a GHCR (ghcr.io/usuario/gestor-backend & gestor-frontend)
       │
       ▼
[ GHCR (Imágenes Inmutables OCI) ]
       ▲
       │ (docker compose pull / Watchtower)
[ Homelab LXC 112 (Proxmox) ] ── (Modelo PULL: 0 puertos entrantes expuestos)
       ├─ PostgreSQL
       ├─ Backend Container (NestJS)
       └─ Frontend Container (Nginx Reverse Proxy)
```

### Principios de Seguridad:
1. **Aislamiento Total del Homelab:** Ningún Pull Request externo puede disparar comandos dentro de tu infraestructura doméstica.
2. **Artefactos Inmutables:** El código se compila una sola vez en la nube; el servidor simplemente ejecuta los binarios precompilados.
3. **Migraciones Seguras:** TypeORM ejecuta migraciones automáticamente al iniciar el contenedor gracias a `DB_MIGRATIONS_RUN=true`.

---

## 2. Dockerfiles del Monorepo

### 2.1. `.dockerignore` (Raíz del proyecto)
Crea este archivo en la raíz del monorepo:

```dockerignore
node_modules
.git
.github
.env
dist
coverage
*.log
.DS_Store
```

---

### 2.2. `apps/backend/Dockerfile`
Compilación multi-etapa optimizada para pnpm y NestJS:

```dockerfile
# ==============================================================================
# 1. Build Stage
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar manifiestos de dependencias del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Instalar todas las dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente del backend
COPY tsconfig.json ./
COPY apps/backend/ ./apps/backend/

# Compilar NestJS
RUN pnpm --filter backend build

# Instalar solo dependencias de producción para el runtime
RUN pnpm --filter backend --prod deploy /prod/backend

# ==============================================================================
# 2. Production Runtime Stage
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Usuario no privilegiado
USER node

# Copiar dependencias de producción y código transpilado
COPY --from=builder --chown=node:node /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/backend/dist ./dist
COPY --from=builder --chown=node:node /app/apps/backend/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

---

### 2.3. `apps/frontend/Dockerfile`
Compila la SPA con Vite y la sirve con Nginx:

```dockerfile
# ==============================================================================
# 1. Build Stage
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

COPY apps/frontend/ ./apps/frontend/
RUN pnpm --filter frontend build

# ==============================================================================
# 2. Web Server Stage (Nginx)
# ==============================================================================
FROM nginx:alpine AS runner

# Copiar configuración de Nginx para SPA y proxy reverso
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos compilados
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

### 2.4. `apps/frontend/nginx.conf`
Configuración para soportar SPA routing y proxy al backend:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy reverso hacia la API de NestJS
    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. GitHub Actions Workflow (`.github/workflows/ci-cd.yml`)

```yaml
name: Monorepo CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io

jobs:
  # ============================================================================
  # 1. LINT, TYPES & TESTS
  # ============================================================================
  validate:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Instalar Dependencias
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Tests Backend
        run: pnpm test:backend

  # ============================================================================
  # 2. BUILD & PUSH A GHCR (Solo en push a main)
  # ============================================================================
  publish:
    name: Build & Push Images
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login en GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Build Backend
      - name: Build & Push Backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/gestor-backend:latest
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/gestor-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Build Frontend
      - name: Build & Push Frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/frontend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/gestor-frontend:latest
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/gestor-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 4. Despliegue en el Homelab (`LXC 112`)

### 4.1. Directorio del Proyecto
```bash
mkdir -p /opt/gestor-suscripciones-docker
cd /opt/gestor-suscripciones-docker
```

### 4.2. Variables de Entorno (`.env`)
```env
# PostgreSQL
POSTGRES_USER=gestor_user
POSTGRES_PASSWORD=tu_password_seguro_postgres
POSTGRES_DB=gestor_suscripciones

# Backend NestJS
PORT=3000
JWT_SECRET=tu_jwt_secret_super_seguro
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=gestor_user
DB_PASSWORD=tu_password_seguro_postgres
DB_DATABASE=gestor_suscripciones
DB_LOGGING=false
DB_MIGRATIONS_RUN=true
EXCHANGERATE_API_KEY=tu_api_key
```

### 4.3. `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: gestor-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ghcr.io/mtdev2312/gestor-backend:latest
    container_name: gestor-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  frontend:
    image: ghcr.io/mtdev2312/gestor-frontend:latest
    container_name: gestor-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  watchtower:
    image: containrrr/watchtower
    container_name: gestor-watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_LABEL_ENABLE=true
      - WATCHTOWER_POLL_INTERVAL=60

volumes:
  postgres_data:
```

---

## 5. Secuencia Lineal de Implementación

1. **Local:** Crear los Dockerfiles (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`, `apps/frontend/nginx.conf`).
2. **Local:** Añadir el workflow `.github/workflows/ci-cd.yml`.
3. **Local:** Commit y push a `main`.
4. **GitHub:** Verificar que el pipeline complete la compilación y publique los dos paquetes (`gestor-backend` y `gestor-frontend`) en GHCR.
5. **En el Homelab (LXC 112):**
   ```bash
   cd /opt/gestor-suscripciones-docker
   docker compose pull
   docker compose up -d
   ```
6. **Verificación:** Acceder por browser al puerto 80 del contenedor o verificar logs con `docker compose logs -f backend`.
