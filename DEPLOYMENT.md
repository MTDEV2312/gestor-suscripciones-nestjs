# Guía de Despliegue en Producción (Deployment Guide)

Este documento detalla los requisitos, variables de entorno y comandos necesarios para compilar, migrar la base de datos y desplegar en producción la aplicación **Gestor de Suscripciones** (Monorepo NestJS + React/Vite).

---

## 📋 Requisitos Previos

- **Node.js**: `v18.x` o superior (Recomendado LTS v20.x).
- **Gestor de paquetes**: `pnpm` (`v9.x` o superior).
- **Base de Datos**: PostgreSQL `v14+` (recomendado para producción) o SQLite (`better-sqlite3`).
- **Gestor de procesos** (opcional pero recomendado): PM2, Docker o Systemd.

---

## ⚙️ 1. Configuración de Variables de Entorno

### Backend (`apps/backend/.env`)

Crea o configura el archivo `.env` en `apps/backend/.env` con los siguientes valores para producción:

```env
# Puerto del Servidor Backend
PORT=3000

# Configuración de Seguridad
JWT_SECRET=tu_clave_secreta_jwt_de_produccion_muy_segura

# Tipo de Base de Datos ('postgres' o 'better-sqlite3')
DB_TYPE=postgres

# Configuración de PostgreSQL (Recomendado para producción)
DB_HOST=aqui_su_host_db
DB_PORT=5432
DB_USERNAME=aqui_su_usuario_db
DB_PASSWORD=aqui_su_password_db
DB_DATABASE=aqui_su_nombre_db

# Logging y Migraciones
DB_LOGGING=false
DB_MIGRATIONS_RUN=true

# Integración con APIs externas
EXCHANGERATE_API_KEY=aqui_su_api_key_exchangerate

# Notificaciones por Telegram (CallMeBot)
TELEGRAM_API_URL=aqui_su_url_telegram_api
ISHTML=yes
ISLINKS=no
```

> ⚠️ **IMPORTANTE**: Asegúrate de tener `DB_LOGGING=false` para prevenir que la consola se llene de logs SQL.

---

## 📦 2. Instalación de Dependencias

Ejecuta la instalación de dependencias en la raíz del proyecto asegurando un bloqueo de versiones estricto:

```bash
pnpm install --frozen-lockfile
```

---

## 🗄️ 3. Migraciones de Base de Datos

Existen dos alternativas para aplicar las migraciones en producción:

### Opción A: Automática al iniciar el Backend (Recomendada)
Al mantener `DB_MIGRATIONS_RUN=true` en el `.env` del backend, NestJS (TypeORM) ejecutará automáticamente todas las migraciones pendientes durante la inicialización de la aplicación.

### Opción B: Ejecución Manual vía CLI
Si prefieres ejecutar las migraciones de forma independiente antes de iniciar la aplicación:

```bash
# Desde la raíz del monorepo:
pnpm --filter backend migration:run

# O ingresando directamente a la carpeta del backend:
cd apps/backend
pnpm migration:run
```

Si necesitas revertir la última migración ejecutada:
```bash
pnpm --filter backend migration:revert
```

---

## 🛠️ 4. Compilación del Proyecto (Build)

### Compilación Completa (Backend + Frontend)
Desde la raíz del monorepo, ejecuta:

```bash
pnpm build
```

Este comando compilará ambos proyectos en paralelo.

### Compilación Individual

- **Solo Backend**:
  ```bash
  pnpm build:backend
  ```
  *Archivos generados en:* `apps/backend/dist/`

- **Solo Frontend**:
  ```bash
  pnpm build:frontend
  ```
  *Archivos generados en:* `apps/frontend/dist/`

---

## 🚀 5. Ejecución y Despliegue en Producción

### 🔹 Despliegue del Backend (NestJS)

#### Opción 1: Ejecución directa con Node.js / pnpm
```bash
pnpm --filter backend start:prod
```
O directamente con Node:
```bash
node apps/backend/dist/main.js
```

#### Opción 2: Usando PM2 (Recomendado para mantener el proceso vivo)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el backend en producción
pm2 start apps/backend/dist/main.js --name "gestor-suscripciones-backend"

# Configurar autostart al reiniciar el servidor
pm2 save
pm2 startup
```

---

### 🔹 Despliegue del Frontend (React + Vite)

El comando `pnpm build:frontend` genera los archivos estáticos listos para producción en `apps/frontend/dist`.

#### Opción 1: Nginx (Recomendado)
Configura un bloque de servidor en `/etc/nginx/sites-available/gestor-suscripciones`:

```nginx
server {
    listen 80;
    server_name tusitio.com;

    root /var/www/gestor-suscripciones/apps/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass aqui_su_url_backend_proxy;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Opción 2: Vercel / Netlify / Cloudflare Pages
- **Build command**: `pnpm --filter frontend build`
- **Output directory**: `apps/frontend/dist`

---

## 🧪 6. Verificación Post-Despliegue

1. Comprobar que el backend responde en el endpoint de salud: `aqui_su_url_salud_backend`
2. Verificar en los logs que no se impriman consultas SQL (`DB_LOGGING=false`).
3. Verificar que las fechas de renovación en el frontend se muestren correctamente acordes a la zona horaria del usuario.
