# Gestor de Suscripciones (Monorepo)

Este proyecto es un monorepo gestionado mediante **pnpm workspaces** que permite a múltiples usuarios registrarse, iniciar sesión y gestionar sus suscripciones recurrentes, recibiendo notificaciones consolidadas diarias de sus renovaciones pendientes a través de Telegram (mediante la API de CallMeBot).

El repositorio está estructurado en dos aplicaciones independientes:
* **`apps/backend`**: API REST robusta en **NestJS** con TypeORM (SQLite) y Cron Jobs.
* **`apps/frontend`**: Cliente SPA moderno y minimalista en **React + Vite + TypeScript** y TailwindCSS.

---

## 🛠️ Tecnologías y Estructura

* **Orquestación**: pnpm workspaces
* **Backend**: NestJS, SQLite (`better-sqlite3`), TypeORM, JWT + Passport, `@nestjs/schedule`
* **Frontend**: React (v18), Vite, TypeScript, TailwindCSS, Recharts, Lucide React

```text
/ (Raíz)
├── apps/
│   ├── backend/      # Servidor NestJS
│   └── frontend/     # Cliente React + Vite
├── package.json
└── pnpm-workspace.yaml
```

---

## ✨ Características Principales

1. **Autenticación y Autorización**: Registro e inicio de sesión seguros mediante JWT. Cada usuario gestiona exclusivamente sus propias suscripciones y perfil.
2. **Gestión de Suscripciones (CRUD)**: Creación, lectura, actualización y eliminación de suscripciones con control de fechas, importes y selector de monedas preestablecidas.
3. **Dashboard de Consumos**: Resumen financiero del usuario que calcula de forma dinámica el gasto proyectado mensual y anual, además de indicar el próximo servicio a vencer y gráficos analíticos.
4. **Gráficos Estadísticos (Recharts)**:
   - Gasto mensual proyectado por servicio.
   - Distribución porcentual de tus consumos.
   - Cantidad de suscripciones activas vs pausadas.
5. **Alertas Automáticas de Telegram**: Proceso programado (Cron Job) que corre diariamente buscando renovaciones vencidas. Agrupa en memoria las alertas de cada usuario y envía una única notificación consolidada diaria por Telegram, evitando spam.

---

## ⚙️ Configuración del Entorno

Crea un archivo `.env` en **`apps/backend/.env`** con la siguiente estructura:

```env
# Configuración de Telegram (CallMeBot)
TELEGRAM_API_URL=http://api.callmebot.com/text.php?
TELEGRAM_USERNAME=@tu_usuario_por_defecto
ISHTML=yes
ISLINKS=no

# Configuración de JWT
JWT_SECRET=super_secret_key_for_testing
```

> [!IMPORTANT]
> **Autorización Anti-Spam de Telegram:**
> Para recibir las notificaciones, cada usuario del sistema debe iniciar una conversación en Telegram con el bot [@CallMeBot_txtbot](https://t.me/CallMeBot_txtbot) y enviar el comando `/start`. De lo contrario, la API externa devolverá un error de permisos.

---

## 🚀 Instrucciones de Ejecución

Todos los comandos deben ejecutarse desde la **raíz del monorepo**:

### Instalación de dependencias
```bash
pnpm install
```

### Ejecutar en Desarrollo
Inicia el backend y el frontend en paralelo en modo observador:
```bash
pnpm dev
```
* *Backend disponible en: `http://localhost:3000/api`*
* *Frontend disponible en: `http://localhost:5173`*

### Compilar para Producción
Compila ambos proyectos:
```bash
pnpm build
```

### Ejecutar en Producción
Inicia el servidor backend compilado y levanta un servidor de pruebas/preview para el cliente estático en paralelo:
```bash
pnpm start
```

---

## 🧪 Pruebas (Tests del Backend)

### Pruebas Unitarias
```bash
pnpm test:backend
```

### Pruebas E2E (End-to-End)
```bash
pnpm test:backend:e2e
```
*Las pruebas E2E validan todo el flujo del sistema: desde el registro y login del usuario, la gestión del perfil (CRUD de usuario), la creación y actualización de suscripciones, consulta del dashboard, hasta la eliminación final de la cuenta.*
