# Arquitectura del Backend - CapitalPass

Este documento describe en detalle la arquitectura, patrones de diseño y estructura del backend de CapitalPass.

## Índice

1. [Visión General](#visión-general)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Flujo de Datos](#flujo-de-datos)
4. [Patrones de Diseño](#patrones-de-diseño)
5. [Módulos y Responsabilidades](#módulos-y-responsabilidades)
6. [Manejo de Transacciones](#manejo-de-transacciones)
7. [Seguridad y Autenticación](#seguridad-y-autenticación)

## Visión General

CapitalPass backend implementa una **arquitectura en capas simplificada** con tres niveles principales:

```
┌──────────────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN            │
│         (Elysia Routes + Middlewares)        │
├──────────────────────────────────────────────┤
│            CAPA DE LÓGICA DE NEGOCIO         │
│               (Controllers)                  │
├──────────────────────────────────────────────┤
│            CAPA DE DATOS                     │
│         (MySQL Pool + Transacciones)         │
└──────────────────────────────────────────────┘
```

### Principios de Diseño

- **Separación de Responsabilidades**: Cada controlador maneja una funcionalidad específica
- **ACID Compliance**: Transacciones financieras con garantías de atomicidad
- **Stateless Authentication**: JWT sin almacenamiento de sesión en servidor
- **Pool de Conexiones**: Reutilización eficiente de conexiones a BD
- **Fail-Fast**: Validaciones tempranas en cada capa

## Estructura de Carpetas

```
back/
│
├── src/                          # Código fuente principal
│   └── index.ts                  # Punto de entrada de la aplicación
│
├── routes/                       # Definición de rutas HTTP
│   └── index.routes.ts           # Router principal con todas las rutas
│
├── controllers/                  # Lógica de negocio
│   ├── auth/                     # Autenticación
│   │   ├── login.controller.ts
│   │   └── signup.controller.ts
│   │
│   ├── users/                    # Gestión de usuarios
│   │   ├── getProfile.controller.ts
│   │   └── updateProfile.controller.ts
│   │
│   ├── balance/                  # Gestión de saldo
│   │   ├── getBalance.controller.ts
│   │   ├── recharge.controller.ts
│   │   └── rechargeByCard.controller.ts
│   │
│   ├── transactions/             # Operaciones de pago
│   │   ├── getTransactions.controller.ts
│   │   ├── pay.controller.ts
│   │   └── payByCard.controller.ts
│   │
│   └── rates/                    # Tarifas de servicios
│       └── getRates.controller.ts
│
├── middlewares/                  # Middleware de aplicación
│   └── auth.middleware.ts        # Verificación JWT
│
├── db/                           # Base de datos
│   ├── db.ts                     # Configuración del pool de conexiones
│   └── db.sql                    # Script de inicialización de BD
│
├── node_modules/                 # Dependencias (ignorado en git)
│
├── package.json                  # Configuración de dependencias
├── tsconfig.json                 # Configuración de TypeScript
├── bun.lock                      # Lock de dependencias
├── Dockerfile                    # Configuración de Docker
├── .env                          # Variables de entorno (ignorado en git)
└── README.md                     # Documentación principal
```

## Flujo de Datos

### Flujo de Petición HTTP

```
1. Cliente HTTP
      ↓
2. Elysia HTTP Server (src/index.ts)
      ↓
3. CORS Middleware (@elysiajs/cors)
      ↓
4. Router (routes/index.routes.ts)
      ↓ [Si ruta protegida]
5. Auth Middleware (middlewares/auth.middleware.ts)
      ↓
6. Controller (controllers/**/*.controller.ts)
      ↓
7. MySQL Pool (db/db.ts)
      ↓
8. Base de Datos MySQL
      ↓
9. Respuesta JSON al cliente
```

### Ejemplo: Flujo de Pago Autenticado

```
POST /api/transactions/pay
Authorization: Bearer eyJhbGc...

    ↓
[1] Elysia recibe la petición
    ↓
[2] CORS valida el origen
    ↓
[3] Router identifica ruta → pay.controller
    ↓
[4] authMiddleware valida JWT
    │   ├─ Extrae token del header
    │   ├─ Verifica firma con JWT_SECRET
    │   └─ Decodifica payload → { id, email }
    ↓
[5] pay.controller ejecuta
    │   ├─ Valida body (service_type, service_details)
    │   ├─ Obtiene conexión del pool
    │   ├─ Inicia transacción BEGIN
    │   ├─ Consulta balance y tarifas
    │   ├─ Valida saldo suficiente
    │   ├─ Calcula monto con descuentos
    │   ├─ UPDATE users SET balance = ...
    │   ├─ INSERT INTO transactions ...
    │   ├─ COMMIT (o ROLLBACK si error)
    │   └─ Libera conexión al pool
    ↓
[6] Respuesta JSON
    {
      "message": "Payment successful",
      "transaction": { ... }
    }
```

## Patrones de Diseño

### 1. Controller Pattern

Cada controlador es una función asíncrona pura que:
- Recibe contexto de Elysia (`user`, `body`, `set`)
- Ejecuta lógica de negocio
- Retorna resultado o error

```typescript
// Estructura estándar de un controller
const controllerName = async ({ user, body, set }: any) => {
  try {
    // Validación de entrada
    if (!body.requiredField) {
      set.status = 400;
      return { message: "Validation error" };
    }

    // Lógica de negocio
    const result = await performBusinessLogic(user, body);

    // Respuesta exitosa
    set.status = 200;
    return { message: "Success", data: result };
  } catch (error) {
    // Manejo de errores
    console.error("Error:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default controllerName;
```

### 2. Singleton Pattern (Connection Pool)

Un único pool de conexiones MySQL compartido:

```typescript
// db/db.ts
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  // ...
  connectionLimit: 10,
});

export default pool; // Exportado como singleton
```

**Ventajas:**
- Reutilización de conexiones
- Límite de conexiones concurrentes
- Mejor rendimiento y gestión de recursos

### 3. Middleware Chain Pattern

```typescript
// Ruta protegida
router.get("/api/users/profile", getProfile, {
  beforeHandle: authMiddleware  // Ejecuta antes del controller
});

// Flujo:
Request → authMiddleware → getProfile → Response
```

### 4. Transaction Script Pattern

Controllers ejecutan scripts transaccionales completos:

```typescript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  // Script de operaciones
  await connection.execute("UPDATE ...");
  await connection.execute("INSERT ...");

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 5. Repository Pattern (Implícito)

Aunque no hay capa repository explícita, cada controller actúa como repository:
- Encapsula acceso a datos
- Abstrae queries SQL
- Retorna objetos de dominio

## Módulos y Responsabilidades

### Módulo: Autenticación (`controllers/auth/`)

**Responsabilidades:**
- Registro de nuevos usuarios
- Login y generación de tokens JWT
- Validación de credenciales

**Archivos:**
- `signup.controller.ts`: Crea usuario, genera card_number, hashea password
- `login.controller.ts`: Valida credenciales, genera JWT

**Dependencias:**
- bcryptjs (hash de passwords)
- jsonwebtoken (generación de tokens)
- MySQL (almacenamiento de usuarios)

### Módulo: Usuarios (`controllers/users/`)

**Responsabilidades:**
- Consulta de perfil de usuario autenticado
- Actualización de datos de perfil

**Archivos:**
- `getProfile.controller.ts`: Retorna datos del usuario autenticado
- `updateProfile.controller.ts`: Actualiza full_name y/o email

**Dependencias:**
- authMiddleware (autenticación requerida)
- MySQL (consultas a tabla users)

### Módulo: Balance (`controllers/balance/`)

**Responsabilidades:**
- Consulta de saldo actual
- Recargas de saldo (autenticadas y públicas)

**Archivos:**
- `getBalance.controller.ts`: Obtiene balance del usuario autenticado
- `recharge.controller.ts`: Recarga con autenticación (user_id desde JWT)
- `rechargeByCard.controller.ts`: Recarga pública por card_number

**Dependencias:**
- MySQL (transacciones en users y transactions)
- authMiddleware (solo en rutas autenticadas)

### Módulo: Transacciones (`controllers/transactions/`)

**Responsabilidades:**
- Procesamiento de pagos de servicios
- Historial de transacciones
- Aplicación de descuentos según user_type

**Archivos:**
- `pay.controller.ts`: Pago autenticado con descuentos
- `payByCard.controller.ts`: Pago público por card_number
- `getTransactions.controller.ts`: Historial del usuario

**Lógica de Negocio:**
```typescript
// Cálculo de descuento
if (user_type === 'subsidiado') {
  discount = base_rate * subsidized_discount;
  final_amount = base_rate - discount;
} else {
  final_amount = base_rate;
}
```

**Dependencias:**
- MySQL (transacciones ACID en users y transactions)
- Tabla rates (tarifas y descuentos)

### Módulo: Tarifas (`controllers/rates/`)

**Responsabilidades:**
- Consulta de tarifas de servicios disponibles

**Archivos:**
- `getRates.controller.ts`: Retorna todas las tarifas con descuentos

**Dependencias:**
- MySQL (consulta a tabla rates)

### Middleware: Autenticación (`middlewares/auth.middleware.ts`)

**Responsabilidades:**
- Validar presencia de header Authorization
- Verificar firma JWT
- Decodificar payload del token
- Pasar usuario al controller

**Flujo:**
```typescript
1. Extraer header Authorization
2. Verificar formato "Bearer {token}"
3. Verificar firma con JWT_SECRET
4. Decodificar payload
5. Retornar { user: decoded } al controller
6. Si falla, retornar 401 Unauthorized
```

## Manejo de Transacciones

### Patrón de Transacción ACID

Todas las operaciones financieras utilizan el mismo patrón:

```typescript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  // 1. Leer estado actual
  const [users] = await connection.execute(
    "SELECT balance FROM users WHERE id = ?",
    [user_id]
  );

  const currentBalance = parseFloat(users[0].balance);

  // 2. Validar operación
  if (currentBalance < amount) {
    throw new Error("Insufficient balance");
  }

  // 3. Actualizar balance
  const newBalance = currentBalance - amount;
  await connection.execute(
    "UPDATE users SET balance = ? WHERE id = ?",
    [newBalance, user_id]
  );

  // 4. Registrar transacción
  await connection.execute(
    "INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after) VALUES (?, ?, ?, ?, ?)",
    [user_id, 'pago_servicio', amount, currentBalance, newBalance]
  );

  // 5. Confirmar cambios
  await connection.commit();
  connection.release();

  return { success: true, newBalance };
} catch (error) {
  // 6. Revertir en caso de error
  await connection.rollback();
  connection.release();
  throw error;
}
```

### Garantías ACID

- **Atomicidad**: BEGIN...COMMIT o ROLLBACK completo
- **Consistencia**: Validaciones antes de modificar datos
- **Aislamiento**: Conexión exclusiva durante la transacción
- **Durabilidad**: COMMIT persiste cambios en disco

### Race Conditions

El pool de conexiones + transacciones previene:
- Doble gasto
- Inconsistencias entre users.balance y transactions
- Lecturas sucias de balance

## Seguridad y Autenticación

### Flujo de Autenticación JWT

```
┌─────────────┐
│   SIGNUP    │
└──────┬──────┘
       │
       ├─ Validar email (regex)
       ├─ Validar password (min 6 chars)
       ├─ Hash password (bcrypt, salt=10)
       ├─ INSERT INTO users
       ├─ Generar card_number = 1000{userId}
       └─ Generar JWT
           ├─ Payload: { id, email, user_type }
           ├─ Secret: JWT_SECRET
           └─ Expira: 4 horas

┌─────────────┐
│    LOGIN    │
└──────┬──────┘
       │
       ├─ Buscar usuario por email
       ├─ Verificar is_active = true
       ├─ Comparar password (bcrypt.compare)
       └─ Generar JWT
           └─ Retornar token

┌─────────────┐
│  PETICIÓN   │
│  PROTEGIDA  │
└──────┬──────┘
       │
       ├─ Extraer header Authorization
       ├─ Verificar formato "Bearer {token}"
       ├─ jwt.verify(token, JWT_SECRET)
       ├─ Decodificar payload → { id, email }
       └─ Pasar { user } al controller
```

### Seguridad en Queries SQL

**Prevención de SQL Injection:**
```typescript
// ✅ CORRECTO: Prepared statements
await connection.execute(
  "SELECT * FROM users WHERE email = ?",
  [email]
);

// ❌ INCORRECTO: Concatenación de strings
await connection.execute(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### Validaciones en Capas

**Capa 1: Middleware**
- Presencia de token
- Validez de firma JWT
- Token no expirado

**Capa 2: Controller**
- Campos requeridos presentes
- Formato de datos correcto
- Valores dentro de rangos válidos

**Capa 3: Base de Datos**
- Constraints UNIQUE (email, card_number)
- Foreign Keys con ON DELETE CASCADE
- ENUM para tipos de datos
- NOT NULL en campos críticos

### Consideraciones de Seguridad

**Fortalezas:**
- Passwords hasheadas con bcrypt
- JWT con expiración
- Prepared statements
- Transacciones ACID
- Validaciones multi-capa

**Áreas de Mejora:**
- Rate limiting (evitar brute force)
- Refresh tokens (seguridad adicional)
- Validación con Zod (instalado pero no usado)
- HTTPS obligatorio en producción
- Rotación de JWT_SECRET
- Logging de operaciones sensibles
- 2FA para operaciones críticas

## Configuración de TypeScript

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

**Características clave:**
- **strict mode**: Tipado estricto habilitado
- **ESNext**: Uso de features modernas de JS/TS
- **noEmit**: Bun maneja la ejecución directamente
- **moduleResolution: bundler**: Optimizado para Bun

## Rendimiento y Optimizaciones

### Pool de Conexiones

```typescript
connectionLimit: 10  // Máximo 10 conexiones concurrentes
waitForConnections: true  // Esperar si no hay conexiones disponibles
queueLimit: 0  // Sin límite de cola
```

**Métricas:**
- Tiempo de obtención de conexión: ~1-5ms (pool)
- Tiempo de nueva conexión: ~50-100ms (sin pool)
- Ganancia: 10-50x más rápido con pool

### Índices en Base de Datos

```sql
-- Índices automáticos por PRIMARY KEY y UNIQUE
users.id (PK)
users.email (UNIQUE)
users.card_number (UNIQUE)
transactions.id (PK)

-- Índice implícito por Foreign Key
transactions.user_id (FK → users.id)
```

**Recomendaciones adicionales:**
- Índice en `transactions.created_at` para consultas de historial
- Índice compuesto en `(user_id, created_at)` para paginación

## Conclusión

La arquitectura de CapitalPass backend es **simple, funcional y segura**. Implementa correctamente los principios ACID para operaciones financieras y utiliza JWT para autenticación stateless. La estructura modular facilita el mantenimiento y la extensión de funcionalidades.

**Próximos pasos recomendados:**
1. Implementar capa de servicios explícita
2. Agregar validación con Zod en todos los endpoints
3. Implementar logging centralizado
4. Añadir paginación en getTransactions
5. Configurar rate limiting
6. Implementar refresh tokens
7. Añadir tests unitarios y de integración

---

**Documento versión**: 1.0.0
**Última actualización**: 2025-01-18
