# Gestor de Suscripciones (NestJS)

> [!IMPORTANT]
> **Proyecto en Construcción:** Esta es una versión preliminar y parcial del proyecto. La lógica de negocio en los controladores, servicios y DTOs se encuentra en su estado inicial (scaffold por defecto) y no representa el producto final.

Este proyecto es una API REST desarrollada con **NestJS** y **TypeORM** para gestionar usuarios y sus respectivas suscripciones.

---

## 🛠️ Tecnologías y Dependencias

- **Framework:** [NestJS](https://nestjs.com/) (v11.0.1)
- **Base de Datos:** SQLite (gestor `better-sqlite3` v12.11.1)
- **ORM:** [TypeORM](https://typeorm.io/) (v1.0.0 con `@nestjs/typeorm` v11.0.2)
- **Gestor de Paquetes:** `pnpm`

---

## 📂 Estructura y Módulos del Proyecto

El backend está estructurado en torno a dos módulos principales en `src/`:

### 1. Módulo de Usuarios (`UsersModule`)
Define y gestiona los usuarios del sistema.

* **Entidad (`User`):**
  - `id`: Identificador único (UUID, Clave Primaria).
  - `username`: Nombre de usuario (único, máximo 20 caracteres).
  - `email`: Correo electrónico (único).
  - `password`: Contraseña hash.
  - `createdAt` / `updatedAt`: Fechas de registro y actualización.
  - **Relación:** `OneToMany` con la entidad `Subscription`.

* **Estado actual:** Controladores, servicios y DTOs generados con la estructura base de NestJS. Lógica de persistencia pendiente de implementar.

---

### 2. Módulo de Suscripciones (`SubscriptionsModule`)
Gestiona las suscripciones asociadas a los usuarios.

* **Entidad (`Subscription`):**
  - `id`: Identificador único (UUID, Clave Primaria).
  - `name`: Nombre de la suscripción (máximo 100 caracteres).
  - `price`: Precio (entero).
  - `currency`: Moneda (máximo 10 caracteres).
  - `frecuency`: Frecuencia de cobro (Enum: `MONTHLY` o `YEARLY`).
  - `renovation_date`: Fecha de renovación.
  - `is_active`: Estado activo/inactivo (booleano).
  - `user_id` / `user`: Relación `ManyToOne` con el usuario dueño de la suscripción.
  - `created_at` / `updated_at`: Fechas de creación y actualización.

* **Estado actual:** Controladores, servicios y DTOs generados con la estructura base de NestJS. Lógica de persistencia pendiente de implementar.

---

## 🚀 Instrucciones de Desarrollo

### Instalación de dependencias
Asegurate de tener instalado `pnpm` y ejecuta:
```bash
pnpm install
```

### Ejecutar en entorno de desarrollo
Levanta el servidor con recarga automática:
```bash
pnpm start:dev
```

### Compilar para producción
Genera el build de distribución:
```bash
pnpm build
```

### Ejecutar en producción
```bash
pnpm start:prod
```

### Pruebas (Tests)
```bash
# Ejecutar todas las pruebas unitarias
pnpm test

# Ejecutar pruebas en modo observador (watch)
pnpm test:watch

# Cobertura de pruebas
pnpm test:cov
```
