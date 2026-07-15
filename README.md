# Gestor de Suscripciones (NestJS)

Este proyecto es una API REST robusta desarrollada con **NestJS** y **TypeORM** (SQLite) que permite a múltiples usuarios registrarse, iniciar sesión y gestionar sus suscripciones recurrentes, recibiendo notificaciones consolidadas diarias de sus renovaciones pendientes a través de Telegram (mediante la API de CallMeBot).

---

## 🛠️ Tecnologías y Dependencias

- **Framework:** [NestJS](https://nestjs.com/) (v11.0.1)
- **Base de Datos:** SQLite (gestor `better-sqlite3` v12.11.1)
- **ORM:** [TypeORM](https://typeorm.io/) (v1.0.0 con `@nestjs/typeorm` v11.0.2)
- **Seguridad:** JWT + Passport + bcrypt
- **Automatización:** `@nestjs/schedule` (Cron Jobs)
- **Cliente HTTP:** `fecth` (para llamadas externas a CallMeBot)
- **Gestor de Paquetes:** `pnpm`

---

## ✨ Características Principales

1. **Autenticación y Autorización:** Registro e inicio de sesión seguros mediante JWT. Cada usuario gestiona exclusivamente sus propias suscripciones y perfil.
2. **Gestión de Suscripciones (CRUD):** Creación, lectura, actualización y eliminación de suscripciones con control de fechas e importes.
3. **Dashboard de Consumos:** Resumen financiero del usuario que calcula de forma dinámica el gasto proyectado mensual y anual, además de indicar el próximo servicio a vencer.
4. **Alertas Automáticas de Telegram:** Proceso programado (Cron Job) que corre de manera diaria buscando renovaciones vencidas. Agrupa en memoria las alertas de cada usuario y envía una única notificación consolidada diaria por Telegram, evitando spam.

---

## 📂 Estructura y Módulos del Proyecto

El backend está estructurado bajo una arquitectura de módulos en `src/`:

### 1. Usuarios (`UsersModule`)
Define y gestiona los datos de los usuarios del sistema.
* **Entidad (`User`):**
  - `id`: Identificador único (UUID, Clave Primaria).
  - `username`: Nombre de usuario (único).
  - `email`: Correo electrónico (único).
  - `password`: Hash bcrypt de la contraseña.
  - `telegramUsername`: Nombre de usuario de Telegram (opcional, utilizado para notificaciones).
  - `createdAt` / `updatedAt`: Fechas de registro y actualización.
  - **Relación:** `OneToMany` con la entidad `Subscription`.

### 2. Suscripciones (`SubscriptionsModule`)
Gestiona los servicios contratados por cada usuario.
* **Entidad (`Subscription`):**
  - `id`: Identificador único (UUID, Clave Primaria).
  - `name`: Nombre del servicio (Netflix, Spotify, etc.).
  - `price`: Precio decimal del servicio.
  - `currency`: Código de la moneda (USD, EUR, etc.).
  - `frequency`: Frecuencia de cobro (Enum: `MONTHLY` o `YEARLY`).
  - `start_date`: Fecha de inicio del servicio.
  - `next_renewal_date`: Próxima fecha de facturación y renovación automática.
  - `is_active`: Estado activo/inactivo (booleano).
  - `user_id` / `user`: Relación `ManyToOne` con el usuario dueño.

### 3. Autenticación (`AuthModule`)
Controla el flujo de registro (`POST /auth/register`) y login (`POST /auth/login`), generando tokens JWT firmados.

### 4. Dashboard (`DashboardModule`)
Calcula los gastos agregados proyectados del usuario actual.

### 5. Tareas Programadas (`CronJobModule`)
Contiene a `RenewalScheduler`, encargado de buscar suscripciones por vencer y procesar las alertas.

### 6. Notificaciones (`NotificationsModule`)
Encapsula la integración HTTP con CallMeBot para enviar mensajes URL-encoded a Telegram.

---

## ⚙️ Configuración del Entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:

```env
# Configuración de Telegram (CallMeBot)
TELEGRAM_API_URL=https://api.callmebot.com/text.php?
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

### Instalación de dependencias
Asegúrate de utilizar `pnpm` para instalar los paquetes:
```bash
pnpm install
```

### Ejecutar en desarrollo
Inicia el servidor con recarga automática:
```bash
pnpm start:dev
```

### Compilar para producción
Genera los archivos compilados en `dist/`:
```bash
pnpm build
```

### Ejecutar en producción
```bash
pnpm start:prod
```

---

## 🧪 Pruebas (Tests)

### Pruebas Unitarias
Ejecuta la suite de pruebas unitarias con Jest:
```bash
pnpm test
```

### Pruebas E2E (End-to-End)
Ejecuta las pruebas de integración del sistema completo:
```bash
pnpm test:e2e
```
*Las pruebas E2E validan todo el flujo del sistema: desde el registro y login del usuario, la gestión del perfil (CRUD de usuario), la creación y actualización de suscripciones, consulta del dashboard, hasta la eliminación final de la cuenta.*
