# CapitalPass Backend API

Sistema de billetera digital para servicios de transporte urbano desarrollado con TypeScript, Elysia y MySQL.

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Arquitectura](#arquitectura)
- [API Endpoints](#api-endpoints)
- [Modelos de Datos](#modelos-de-datos)
- [Seguridad](#seguridad)
- [Desarrollo](#desarrollo)
- [Despliegue](#despliegue)

## Descripción General

CapitalPass es una API REST que permite gestionar una billetera digital para el pago de servicios de transporte urbano (TransMilenio, bicicletas, parqueaderos). El sistema incluye:

- Sistema de autenticación con JWT
- Gestión de usuarios y perfiles
- Recargas de saldo
- Pagos de servicios con tarifas diferenciadas
- Descuentos para usuarios subsidiados
- Historial de transacciones

## Tecnologías

### Runtime y Framework
- **Bun** v1.0+ - Runtime JavaScript ultrarrápido
- **Elysia** v1.4.12 - Framework web ligero para TypeScript
- **TypeScript** v5+ - Tipado estático con strict mode

### Base de Datos
- **MySQL** 8.0+ - Base de datos relacional
- **mysql2** v3.15.2 - Cliente MySQL con pool de conexiones

### Seguridad
- **bcryptjs** v3.0.2 - Hash de contraseñas (10 salt rounds)
- **jsonwebtoken** v9.0.2 - Autenticación JWT
- **@elysiajs/jwt** v1.4.0 - Integración JWT con Elysia

### Validación y CORS
- **Zod** v4.1.12 - Validación de esquemas
- **@elysiajs/cors** v1.4.0 - Manejo de CORS

## Instalación

### Prerrequisitos

- Bun v1.0 o superior
- MySQL 8.0 o superior

### Pasos

1. Clonar el repositorio:
```bash
cd back
```

2. Instalar dependencias:
```bash
bun install
```

3. Configurar la base de datos:
```bash
# Crear la base de datos
mysql -u root -p < db/db.sql
```

4. Configurar variables de entorno (ver sección siguiente)

5. Ejecutar el servidor:
```bash
# Desarrollo (con hot reload)
bun run dev

# Producción
bun run start
```

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Servidor
PORT=4000

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=capitalpass_user
DB_PASSWORD=capitalpass_pass
DB_DATABASE=capitalpass

# Autenticación
JWT_SECRET=tu_clave_secreta_muy_segura
TOKEN_EXPIRATION=4h
API_KEY=tu_api_key_para_operaciones_especiales
```

### Configuración de Base de Datos

El script `db/db.sql` crea:
- Base de datos `capitalpass`
- Tablas: `users`, `transactions`, `rates`
- Datos iniciales de tarifas
- Usuario MySQL: `capitalpass_user`

## Arquitectura

### Estructura de Carpetas

```
back/
├── src/
│   └── index.ts              # Punto de entrada principal
├── routes/
│   └── index.routes.ts       # Definición de rutas
├── controllers/              # Lógica de negocio
│   ├── auth/
│   │   ├── login.controller.ts
│   │   └── signup.controller.ts
│   ├── users/
│   │   ├── getProfile.controller.ts
│   │   └── updateProfile.controller.ts
│   ├── balance/
│   │   ├── getBalance.controller.ts
│   │   ├── recharge.controller.ts
│   │   └── rechargeByCard.controller.ts
│   ├── transactions/
│   │   ├── getTransactions.controller.ts
│   │   ├── pay.controller.ts
│   │   └── payByCard.controller.ts
│   └── rates/
│       └── getRates.controller.ts
├── middlewares/
│   └── auth.middleware.ts    # Verificación JWT
├── db/
│   ├── db.ts                 # Conexión MySQL (pool)
│   └── db.sql                # Script de inicialización
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env
```

### Patrón de Arquitectura

El backend implementa una **arquitectura en capas simple**:

```
┌─────────────────────────────────┐
│   ROUTES (index.routes.ts)      │ ← Definición de endpoints
├─────────────────────────────────┤
│   CONTROLLERS (carpeta)         │ ← Lógica de negocio
├─────────────────────────────────┤
│   MIDDLEWARES (auth.middleware) │ ← Autenticación
├─────────────────────────────────┤
│   DB (db.ts + db.sql)           │ ← Base de datos
└─────────────────────────────────┘
```

### Flujo de Datos

```
Cliente HTTP
    ↓
Elysia Router
    ↓
Middleware Auth (si aplica)
    ↓
Controller (validación + lógica)
    ↓
Pool MySQL (queries + transacciones)
    ↓
Respuesta JSON
```

## API Endpoints

### Autenticación

#### Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "123456",
  "user_type": "normal"
}

Response 201:
{
  "message": "User created successfully",
  "user": {
    "id": 1000,
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "card_number": "10001000",
    "balance": "0.00"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Tipos de usuario disponibles:**
- `normal` - Usuario regular sin descuentos
- `subsidiado` - Usuario con descuentos en servicios
- `operador` - Usuario administrativo
- `bicicleta` - Proveedor de servicio de bicicletas
- `parqueadero` - Proveedor de servicio de parqueaderos

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "123456"
}

Response 200:
{
  "message": "Login successful",
  "user": {
    "id": 1000,
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "card_number": "10001000",
    "balance": "0.00"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Usuarios (Autenticadas)

Todas las rutas de usuarios requieren header:
```
Authorization: Bearer {token}
```

#### Obtener Perfil
```http
GET /api/users/profile
Authorization: Bearer {token}

Response 200:
{
  "id": 1000,
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "user_type": "normal",
  "card_number": "10001000",
  "balance": "50000.00"
}
```

#### Actualizar Perfil
```http
PUT /api/users/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "Juan Carlos Pérez",
  "email": "juancarlos@example.com"
}

Response 200:
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### Balance (Autenticadas)

#### Obtener Saldo
```http
GET /api/balance
Authorization: Bearer {token}

Response 200:
{
  "balance": "50000.00"
}
```

#### Recargar Saldo (Autenticado)
```http
POST /api/balance/recharge
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 50000
}

Response 200:
{
  "message": "Balance recharged successfully",
  "new_balance": "100000.00"
}
```

### Recargas Públicas

#### Recargar por Número de Tarjeta
```http
POST /api/public/recharge
Content-Type: application/json

{
  "card_number": "10001000",
  "amount": 50000
}

Response 200:
{
  "message": "Balance recharged successfully",
  "new_balance": "100000.00"
}
```

### Transacciones (Autenticadas)

#### Realizar Pago
```http
POST /api/transactions/pay
Authorization: Bearer {token}
Content-Type: application/json

{
  "service_type": "transmilenio",
  "service_details": "Estación Calle 26"
}

Response 200:
{
  "message": "Payment successful",
  "transaction": {
    "id": 123,
    "amount": "3000.00",
    "discount_applied": "0.00",
    "balance_before": "50000.00",
    "balance_after": "47000.00",
    "service_type": "transmilenio"
  }
}
```

**Tipos de servicio disponibles:**
- `transmilenio` - Tarifa base: $3,000 (25% desc. subsidiado)
- `bicicleta` - Tarifa base: $5,000 (20% desc. subsidiado)
- `parqueadero` - Tarifa base: $4,000 (15% desc. subsidiado)

#### Pago por Tarjeta (Público)
```http
POST /api/public/pay
Content-Type: application/json

{
  "card_number": "10001000",
  "service_type": "transmilenio",
  "service_details": "Estación Portal Norte"
}

Response 200:
{
  "message": "Payment successful",
  "transaction": { ... }
}
```

#### Obtener Historial de Transacciones
```http
GET /api/transactions
Authorization: Bearer {token}

Response 200:
{
  "transactions": [
    {
      "id": 123,
      "transaction_type": "recarga",
      "amount": "50000.00",
      "balance_before": "0.00",
      "balance_after": "50000.00",
      "service_details": null,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 124,
      "transaction_type": "pago_transmilenio",
      "amount": "3000.00",
      "balance_before": "50000.00",
      "balance_after": "47000.00",
      "service_details": "Estación Calle 26",
      "created_at": "2025-01-15T11:00:00Z"
    }
  ]
}
```

### Tarifas (Pública)

#### Obtener Tarifas de Servicios
```http
GET /api/rates

Response 200:
{
  "rates": [
    {
      "id": 1,
      "service_name": "transmilenio",
      "base_rate": "3000.00",
      "subsidized_discount": "0.25"
    },
    {
      "id": 2,
      "service_name": "bicicleta",
      "base_rate": "5000.00",
      "subsidized_discount": "0.20"
    },
    {
      "id": 3,
      "service_name": "parqueadero",
      "base_rate": "4000.00",
      "subsidized_discount": "0.15"
    }
  ]
}
```

### Health Check

```http
GET /ping

Response 200:
"pong"
```

## Modelos de Datos

### Tabla `users`

| Campo         | Tipo                 | Descripción                          |
|---------------|----------------------|--------------------------------------|
| id            | INT (PK)             | ID auto-incremental desde 1000       |
| card_number   | VARCHAR(20) UNIQUE   | Número de tarjeta único (10001000+)  |
| full_name     | VARCHAR(100)         | Nombre completo del usuario          |
| email         | VARCHAR(100) UNIQUE  | Email único                          |
| password_hash | VARCHAR(255)         | Hash bcrypt de la contraseña         |
| user_type     | ENUM                 | Tipo de usuario (normal, subsidiado) |
| balance       | DECIMAL(10,2)        | Saldo actual de la billetera         |
| is_active     | BOOLEAN              | Estado de la cuenta                  |
| created_at    | TIMESTAMP            | Fecha de creación                    |
| updated_at    | TIMESTAMP            | Última actualización                 |

### Tabla `transactions`

| Campo             | Tipo         | Descripción                              |
|-------------------|--------------|------------------------------------------|
| id                | INT (PK)     | ID auto-incremental                      |
| user_id           | INT (FK)     | Referencia a users.id                    |
| transaction_type  | ENUM         | Tipo de transacción                      |
| amount            | DECIMAL(10,2)| Monto de la transacción                  |
| balance_before    | DECIMAL(10,2)| Saldo antes de la transacción            |
| balance_after     | DECIMAL(10,2)| Saldo después de la transacción          |
| service_details   | VARCHAR(255) | Detalles del servicio (opcional)         |
| created_at        | TIMESTAMP    | Fecha y hora de la transacción           |

**Tipos de transacción:**
- `recarga`
- `pago_transmilenio`
- `pago_bicicleta`
- `pago_parqueadero`

### Tabla `rates`

| Campo                | Tipo         | Descripción                          |
|----------------------|--------------|--------------------------------------|
| id                   | INT (PK)     | ID auto-incremental                  |
| service_name         | VARCHAR(50)  | Nombre del servicio                  |
| base_rate            | DECIMAL(10,2)| Tarifa base del servicio             |
| subsidized_discount  | DECIMAL(3,2) | Porcentaje de descuento (0.00-1.00)  |
| updated_at           | TIMESTAMP    | Última actualización                 |

## Seguridad

### Autenticación JWT

- **Algoritmo**: HS256
- **Expiración**: Configurable vía `TOKEN_EXPIRATION` (default: 4h)
- **Payload**: `{ id, email, user_type }`
- **Header requerido**: `Authorization: Bearer {token}`

### Hash de Contraseñas

- **Algoritmo**: bcryptjs
- **Salt Rounds**: 10
- Validación mínima: 6 caracteres

### Prevención de Vulnerabilidades

- **SQL Injection**: Uso de prepared statements con placeholders `?`
- **Transacciones ACID**: Operaciones financieras con `BEGIN`, `COMMIT`, `ROLLBACK`
- **Validación de Entrada**: Verificación de tipos y formato en todos los endpoints
- **Control de Acceso**: Middleware JWT en rutas protegidas

### CORS

Configuración actual permite todos los orígenes (desarrollo):
```typescript
cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
})
```

**Nota**: En producción, configurar orígenes específicos.

## Desarrollo

### Ejecutar en Modo Desarrollo

```bash
bun run dev
```

El servidor se reinicia automáticamente con hot reload al detectar cambios.

### Estructura de un Controller

```typescript
const miController = async ({ user, body, set }: any) => {
  try {
    // 1. Validar entrada
    if (!body.campo_requerido) {
      set.status = 400;
      return { message: "Campo requerido faltante" };
    }

    // 2. Obtener conexión a BD
    const connection = await pool.getConnection();

    try {
      // 3. Iniciar transacción (si aplica)
      await connection.beginTransaction();

      // 4. Ejecutar queries
      const [rows] = await connection.execute(
        "SELECT * FROM tabla WHERE id = ?",
        [user.id]
      );

      // 5. Confirmar transacción
      await connection.commit();

      // 6. Retornar respuesta
      set.status = 200;
      return { message: "Operación exitosa", data: rows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error en operación:", error);
    set.status = 500;
    return { message: "Error interno del servidor" };
  }
};

export default miController;
```

### Agregar Nueva Ruta Protegida

1. Crear controller en `controllers/modulo/accion.controller.ts`
2. Agregar ruta en `routes/index.routes.ts`:

```typescript
.get("/api/nueva-ruta", nuevoController, {
  beforeHandle: authMiddleware
})
```

### Pool de Conexiones MySQL

Configuración en `db/db.ts`:
```typescript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
});
```

## Despliegue

### Docker

El proyecto incluye un `Dockerfile`:

```bash
# Construir imagen
docker build -t capitalpass-backend .

# Ejecutar contenedor
docker run -p 4000:4000 --env-file .env capitalpass-backend
```

### Variables de Entorno en Producción

Asegurarse de configurar:
- `JWT_SECRET` con una clave aleatoria segura (min. 32 caracteres)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD` con credenciales seguras
- `PORT` según el entorno de hosting
- Configurar CORS con orígenes específicos

### Checklist de Producción

- [ ] Configurar `JWT_SECRET` seguro
- [ ] Configurar CORS con orígenes permitidos
- [ ] Usar HTTPS para todas las comunicaciones
- [ ] Configurar rate limiting
- [ ] Implementar logging centralizado
- [ ] Configurar monitoreo y alertas
- [ ] Backup automático de base de datos
- [ ] Revisar y rotar credenciales regularmente

## Scripts Disponibles

```bash
# Desarrollo con hot reload
bun run dev

# Producción
bun run start

# Instalar dependencias
bun install
```

## Códigos de Estado HTTP

- `200` - Operación exitosa
- `201` - Recurso creado exitosamente
- `400` - Error de validación o datos incorrectos
- `401` - No autenticado o token inválido
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

## Soporte y Contacto

Para reportar bugs o solicitar features, crear un issue en el repositorio del proyecto.

## Licencia

Este proyecto es parte del sistema CapitalPass.

---

**Versión**: 1.0.0
**Última actualización**: 2025-01-18
