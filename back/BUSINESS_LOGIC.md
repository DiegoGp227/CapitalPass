# Business Logic Documentation - CapitalPass

Documentación completa de la lógica de negocio, flujos de trabajo y reglas implementadas.

## Índice

1. [Reglas de Negocio](#reglas-de-negocio)
2. [Flujos de Trabajo](#flujos-de-trabajo)
3. [Cálculo de Tarifas y Descuentos](#cálculo-de-tarifas-y-descuentos)
4. [Validaciones](#validaciones)
5. [Transacciones Financieras](#transacciones-financieras)
6. [Casos de Uso](#casos-de-uso)
7. [Manejo de Errores](#manejo-de-errores)

## Reglas de Negocio

### 1. Gestión de Usuarios

#### Registro de Usuarios

**Reglas:**
- Email debe ser único en el sistema
- Email debe tener formato válido (regex)
- Password debe tener mínimo 6 caracteres
- Password se almacena hasheado con bcrypt (10 salt rounds)
- Número de tarjeta se genera automáticamente: `1000{userId}`
- Balance inicial es $0.00
- Usuario se crea activo por defecto (`is_active = true`)
- Se genera token JWT válido por 4 horas

**Implementación:** `controllers/auth/signup.controller.ts`

```typescript
// Validación de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return error;
}

// Hash de password
const hashedPassword = await bcrypt.hash(password, 10);

// Generación de card_number
const cardNumber = `1000${userId}`;

// Generación de JWT
const token = jwt.sign(
  { id: userId, email, user_type },
  JWT_SECRET,
  { expiresIn: TOKEN_EXPIRATION }
);
```

#### Login de Usuarios

**Reglas:**
- Email debe existir en la base de datos
- Cuenta debe estar activa (`is_active = true`)
- Password debe coincidir con hash almacenado
- Se genera nuevo token JWT en cada login
- Token incluye: `{ id, email }`

**Implementación:** `controllers/auth/login.controller.ts`

```typescript
// Verificar cuenta activa
if (!user.is_active) {
  return { message: "Account is not active" };
}

// Comparar passwords
const isValidPassword = await bcrypt.compare(password, user.password_hash);
```

#### Actualización de Perfil

**Reglas:**
- Solo usuario autenticado puede actualizar su perfil
- Al menos un campo (full_name o email) debe estar presente
- Si se actualiza email, debe ser único en el sistema
- No se puede actualizar: password, user_type, balance, card_number

**Implementación:** `controllers/users/updateProfile.controller.ts`

---

### 2. Gestión de Saldo

#### Recargas

**Reglas:**
- Monto debe ser mayor a 0
- Se registra balance antes y después
- Se crea registro en tabla transactions con tipo 'recarga'
- Balance nuevo = balance anterior + monto
- Operación es atómica (transacción ACID)

**Implementación:**
- `controllers/balance/recharge.controller.ts` (autenticado)
- `controllers/balance/rechargeByCard.controller.ts` (público)

```typescript
const newBalance = currentBalance + amount;

await connection.execute(
  "UPDATE users SET balance = ? WHERE id = ?",
  [newBalance, userId]
);

await connection.execute(
  "INSERT INTO transactions (...) VALUES (...)",
  [userId, 'recarga', amount, currentBalance, newBalance]
);
```

---

### 3. Gestión de Pagos

#### Pagos de Servicios

**Reglas:**
- Usuario debe tener saldo suficiente
- Tarifa se obtiene de tabla rates según service_type
- Se aplica descuento si user_type = 'subsidiado'
- Balance nuevo = balance anterior - monto final
- Se registra transacción con tipo específico (pago_transmilenio, etc.)
- Operación es atómica (transacción ACID)

**Tipos de Servicio:**
- `transmilenio`: Transporte público
- `bicicleta`: Servicio de bicicletas
- `parqueadero`: Servicio de parqueaderos

**Implementación:**
- `controllers/transactions/pay.controller.ts` (autenticado)
- `controllers/transactions/payByCard.controller.ts` (público)

---

### 4. Tipos de Usuario y Permisos

**Tipos de Usuario:**

| Tipo | Descuentos | Uso Principal |
|------|------------|---------------|
| `normal` | No | Usuario regular del sistema |
| `subsidiado` | Sí (según servicio) | Usuario con beneficios sociales |
| `operador` | No | Administrador del sistema |
| `bicicleta` | No | Proveedor de servicio de bicicletas |
| `parqueadero` | No | Proveedor de servicio de parqueaderos |

**Nota:** Actualmente solo `subsidiado` tiene lógica de descuentos implementada.

---

## Flujos de Trabajo

### Flujo 1: Registro y Primera Recarga

```
┌─────────────────────┐
│ Usuario ingresa     │
│ datos de registro   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validar email       │
│ y password          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Hash password       │
│ con bcrypt          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Insertar usuario    │
│ en base de datos    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Generar card_number │
│ = 1000{userId}      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Generar JWT token   │
│ válido por 4h       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Retornar usuario    │
│ y token             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Usuario realiza     │
│ primera recarga     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Obtener conexión    │
│ del pool            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ BEGIN TRANSACTION   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UPDATE balance      │
│ = 0 + monto         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ INSERT transaction  │
│ tipo 'recarga'      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ COMMIT              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Liberar conexión    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Retornar nuevo      │
│ balance             │
└─────────────────────┘
```

---

### Flujo 2: Pago de Servicio con Descuento

```
┌─────────────────────┐
│ Usuario autenticado │
│ solicita pago       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validar JWT token   │
│ extraer user_id     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validar service_type│
│ en request          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Obtener conexión    │
│ del pool            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ BEGIN TRANSACTION   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SELECT balance      │
│ y user_type         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SELECT tarifa       │
│ desde rates         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ¿user_type =        │
│  'subsidiado'?      │
└──────┬──────┬───────┘
       │ Sí   │ No
       ▼      ▼
   ┌───────┐ ┌──────────┐
   │Aplicar│ │Sin       │
   │desc.  │ │descuento │
   └───┬───┘ └────┬─────┘
       │          │
       └────┬─────┘
            ▼
┌─────────────────────┐
│ Calcular monto      │
│ final               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ¿Saldo suficiente?  │
└──────┬──────┬───────┘
       │ Sí   │ No
       ▼      ▼
   ┌───────┐ ┌──────────┐
   │Cont.  │ │ROLLBACK  │
   │       │ │Error 400 │
   └───┬───┘ └──────────┘
       │
       ▼
┌─────────────────────┐
│ UPDATE balance      │
│ = actual - monto    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ INSERT transaction  │
│ tipo 'pago_X'       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ COMMIT              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Liberar conexión    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Retornar detalles   │
│ de transacción      │
└─────────────────────┘
```

---

## Cálculo de Tarifas y Descuentos

### Fórmulas

#### Tarifa Base (Usuario Normal)
```
Monto Final = base_rate
```

#### Tarifa con Descuento (Usuario Subsidiado)
```
Descuento = base_rate × subsidized_discount
Monto Final = base_rate - descuento
```

### Ejemplos de Cálculo

#### 1. TransMilenio - Usuario Normal
```
Servicio: transmilenio
base_rate: 3000.00
user_type: normal
subsidized_discount: 0.25 (no aplica)

Cálculo:
  monto_final = 3000.00
  descuento = 0.00

Balance antes: 50000.00
Balance después: 47000.00
```

#### 2. TransMilenio - Usuario Subsidiado
```
Servicio: transmilenio
base_rate: 3000.00
user_type: subsidiado
subsidized_discount: 0.25 (25%)

Cálculo:
  descuento = 3000.00 × 0.25 = 750.00
  monto_final = 3000.00 - 750.00 = 2250.00

Balance antes: 50000.00
Balance después: 47750.00
```

#### 3. Bicicleta - Usuario Subsidiado
```
Servicio: bicicleta
base_rate: 5000.00
user_type: subsidiado
subsidized_discount: 0.20 (20%)

Cálculo:
  descuento = 5000.00 × 0.20 = 1000.00
  monto_final = 5000.00 - 1000.00 = 4000.00

Balance antes: 50000.00
Balance después: 46000.00
```

#### 4. Parqueadero - Usuario Subsidiado
```
Servicio: parqueadero
base_rate: 4000.00
user_type: subsidiado
subsidized_discount: 0.15 (15%)

Cálculo:
  descuento = 4000.00 × 0.15 = 600.00
  monto_final = 4000.00 - 600.00 = 3400.00

Balance antes: 50000.00
Balance después: 46600.00
```

### Tabla de Descuentos

| Servicio | Tarifa Base | Descuento | Usuario Normal | Usuario Subsidiado | Ahorro |
|----------|-------------|-----------|----------------|-------------------|--------|
| TransMilenio | $3,000 | 25% | $3,000 | $2,250 | $750 |
| Bicicleta | $5,000 | 20% | $5,000 | $4,000 | $1,000 |
| Parqueadero | $4,000 | 15% | $4,000 | $3,400 | $600 |

---

## Validaciones

### Validaciones en Registro (Signup)

```typescript
// 1. Campos requeridos
if (!full_name || !email || !password || !user_type) {
  return { message: "All fields are required" };
}

// 2. Formato de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return { message: "Invalid email format" };
}

// 3. Longitud de password
if (password.length < 6) {
  return { message: "Password must be at least 6 characters" };
}

// 4. Tipo de usuario válido
const validTypes = ['normal', 'subsidiado', 'operador', 'bicicleta', 'parqueadero'];
if (!validTypes.includes(user_type)) {
  return { message: "Invalid user type" };
}

// 5. Email único
const [existing] = await pool.execute(
  "SELECT id FROM users WHERE email = ?",
  [email]
);
if (existing.length > 0) {
  return { message: "Email already exists" };
}
```

### Validaciones en Login

```typescript
// 1. Campos requeridos
if (!email || !password) {
  return { message: "Email and password are required" };
}

// 2. Usuario existe
const [users] = await pool.execute(
  "SELECT * FROM users WHERE email = ?",
  [email]
);
if (users.length === 0) {
  return { message: "Invalid credentials" };
}

// 3. Cuenta activa
if (!user.is_active) {
  return { message: "Account is not active" };
}

// 4. Password correcto
const isValidPassword = await bcrypt.compare(password, user.password_hash);
if (!isValidPassword) {
  return { message: "Invalid credentials" };
}
```

### Validaciones en Pago

```typescript
// 1. Servicio válido
const validServices = ['transmilenio', 'bicicleta', 'parqueadero'];
if (!validServices.includes(service_type)) {
  return { message: "Invalid service type" };
}

// 2. Tarifa existe
const [rates] = await pool.execute(
  "SELECT * FROM rates WHERE service_name = ?",
  [service_type]
);
if (rates.length === 0) {
  return { message: "Service rate not found" };
}

// 3. Saldo suficiente
if (parseFloat(balance) < finalAmount) {
  return { message: "Insufficient balance" };
}
```

### Validaciones en Recarga

```typescript
// 1. Monto requerido
if (!amount) {
  return { message: "Amount is required" };
}

// 2. Monto positivo
if (amount <= 0) {
  return { message: "Amount must be greater than 0" };
}

// 3. Tarjeta existe (en recarga pública)
const [users] = await pool.execute(
  "SELECT * FROM users WHERE card_number = ?",
  [card_number]
);
if (users.length === 0) {
  return { message: "Card not found" };
}
```

---

## Transacciones Financieras

### Patrón de Transacción ACID

Todas las operaciones financieras siguen este patrón:

```typescript
const connection = await pool.getConnection();
try {
  // 1. Iniciar transacción
  await connection.beginTransaction();

  // 2. Leer estado actual (con lock)
  const [users] = await connection.execute(
    "SELECT balance, user_type FROM users WHERE id = ? FOR UPDATE",
    [userId]
  );

  const currentBalance = parseFloat(users[0].balance);

  // 3. Validar operación
  if (currentBalance < amount) {
    throw new Error("Insufficient balance");
  }

  // 4. Calcular nuevo balance
  const newBalance = currentBalance - amount;

  // 5. Actualizar balance
  await connection.execute(
    "UPDATE users SET balance = ? WHERE id = ?",
    [newBalance, userId]
  );

  // 6. Registrar transacción
  await connection.execute(
    `INSERT INTO transactions (
      user_id, transaction_type, amount,
      balance_before, balance_after, service_details
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, transactionType, amount, currentBalance, newBalance, details]
  );

  // 7. Confirmar cambios
  await connection.commit();
  connection.release();

  return { success: true, newBalance };
} catch (error) {
  // 8. Revertir en caso de error
  await connection.rollback();
  connection.release();
  throw error;
}
```

### Garantías ACID

#### Atomicidad
- Todas las operaciones (UPDATE + INSERT) se ejecutan como una unidad
- Si falla una, se revierten todas (ROLLBACK)

#### Consistencia
- Balance nunca queda inconsistente con transacciones
- Validaciones antes de modificar datos
- Constraints de BD garantizan integridad

#### Aislamiento
- `FOR UPDATE` previene lecturas sucias
- Conexión exclusiva durante la transacción
- Previene race conditions

#### Durabilidad
- `COMMIT` persiste cambios en disco
- No se pierden transacciones confirmadas

### Prevención de Race Conditions

**Escenario: Dos pagos simultáneos**

Sin `FOR UPDATE`:
```
Usuario tiene $3000

Proceso A lee balance: $3000
Proceso B lee balance: $3000  // Lee el mismo valor!
Proceso A paga $3000 → balance = $0
Proceso B paga $3000 → balance = $0  // ¡Doble gasto!

Resultado: Usuario gastó $6000 con solo $3000
```

Con `FOR UPDATE`:
```
Usuario tiene $3000

Proceso A lee balance: $3000 (lock adquirido)
Proceso B espera...
Proceso A paga $3000 → balance = $0 (commit, libera lock)
Proceso B lee balance: $0 (lock adquirido)
Proceso B intenta pagar $3000 → ERROR: Insufficient balance

Resultado: Solo una transacción exitosa
```

---

## Casos de Uso

### Caso de Uso 1: Usuario Nuevo Realiza Primera Compra

**Actores:** Usuario, Sistema

**Precondiciones:** Ninguna

**Flujo Principal:**
1. Usuario accede a la aplicación
2. Usuario selecciona "Registrarse"
3. Usuario ingresa: nombre, email, password, tipo de usuario
4. Sistema valida datos
5. Sistema hashea password
6. Sistema crea usuario en BD
7. Sistema genera número de tarjeta
8. Sistema genera token JWT
9. Sistema retorna usuario y token
10. Usuario recibe confirmación de registro
11. Usuario selecciona "Recargar saldo"
12. Usuario ingresa monto (ej: $50,000)
13. Sistema procesa recarga en transacción ACID
14. Sistema actualiza balance
15. Sistema registra transacción
16. Usuario recibe confirmación de recarga
17. Usuario selecciona servicio (ej: TransMilenio)
18. Sistema obtiene tarifa
19. Sistema aplica descuento si es subsidiado
20. Sistema valida saldo suficiente
21. Sistema procesa pago en transacción ACID
22. Sistema actualiza balance
23. Sistema registra transacción
24. Usuario recibe confirmación de pago

**Postcondiciones:**
- Usuario registrado en sistema
- Balance actualizado
- Transacciones registradas

---

### Caso de Uso 2: Recarga Pública de Tarjeta

**Actores:** Operador de Punto de Recarga, Sistema

**Precondiciones:** Tarjeta existe en sistema

**Flujo Principal:**
1. Cliente presenta tarjeta física
2. Operador lee número de tarjeta
3. Operador ingresa número en sistema
4. Operador ingresa monto a recargar
5. Sistema valida número de tarjeta
6. Sistema procesa pago externo (no implementado)
7. Sistema inicia transacción ACID
8. Sistema actualiza balance
9. Sistema registra transacción
10. Sistema retorna nuevo balance
11. Operador confirma recarga al cliente

**Postcondiciones:**
- Balance actualizado
- Transacción registrada

---

### Caso de Uso 3: Pago en Punto de Servicio

**Actores:** Usuario, Terminal de Pago, Sistema

**Precondiciones:** Tarjeta tiene saldo

**Flujo Principal:**
1. Usuario presenta tarjeta en terminal
2. Terminal lee número de tarjeta
3. Terminal envía solicitud de pago
4. Sistema valida tarjeta
5. Sistema obtiene tarifa del servicio
6. Sistema obtiene tipo de usuario
7. Sistema calcula monto (con descuento si aplica)
8. Sistema valida saldo suficiente
9. Sistema inicia transacción ACID
10. Sistema actualiza balance
11. Sistema registra transacción
12. Sistema retorna confirmación
13. Terminal imprime comprobante
14. Usuario recibe comprobante

**Postcondiciones:**
- Balance actualizado
- Transacción registrada
- Servicio habilitado

---

## Manejo de Errores

### Estrategia de Manejo de Errores

Todos los controllers siguen este patrón:

```typescript
const controller = async ({ user, body, set }: any) => {
  try {
    // 1. Validaciones de entrada
    if (!body.requiredField) {
      set.status = 400;
      return { message: "Validation error" };
    }

    // 2. Lógica de negocio
    const result = await performOperation();

    // 3. Respuesta exitosa
    set.status = 200;
    return { message: "Success", data: result };
  } catch (error) {
    // 4. Logging de error
    console.error("Error in controller:", error);

    // 5. Respuesta de error genérica
    set.status = 500;
    return { message: "Internal server error" };
  }
};
```

### Tipos de Errores

#### 1. Errores de Validación (400)
```typescript
// Campos faltantes
{ message: "Email and password are required" }

// Formato inválido
{ message: "Invalid email format" }

// Valores fuera de rango
{ message: "Amount must be greater than 0" }
```

#### 2. Errores de Autenticación (401)
```typescript
// Token no proporcionado
{ message: "No token provided" }

// Token inválido
{ message: "Invalid token" }

// Cuenta inactiva
{ message: "Account is not active" }
```

#### 3. Errores de Recursos (404)
```typescript
// Usuario no encontrado
{ message: "User not found" }

// Tarjeta no encontrada
{ message: "Card not found" }

// Tarifa no encontrada
{ message: "Service rate not found" }
```

#### 4. Errores de Lógica de Negocio (400)
```typescript
// Saldo insuficiente
{ message: "Insufficient balance" }

// Email duplicado
{ message: "Email already exists" }

// Credenciales inválidas
{ message: "Invalid credentials" }
```

#### 5. Errores del Servidor (500)
```typescript
// Error genérico
{ message: "Internal server error" }

// Error de base de datos (no exponer detalles)
console.error("Database error:", error);
return { message: "Internal server error" };
```

### Logging de Errores

Todos los errores se loguean en consola:

```typescript
console.error("Error in signup:", error);
console.error("Error in login:", error);
console.error("Error in payment:", error);
```

**Recomendaciones:**
- Implementar logging centralizado (Winston, Pino)
- No exponer detalles internos al cliente
- Loguear stack traces en desarrollo
- Enviar alertas en producción

---

## Mejoras Recomendadas

### 1. Validación con Zod

```typescript
import { z } from 'zod';

const signupSchema = z.object({
  full_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  user_type: z.enum(['normal', 'subsidiado', 'operador', 'bicicleta', 'parqueadero'])
});

const { full_name, email, password, user_type } = signupSchema.parse(body);
```

### 2. Capa de Servicios

```typescript
// services/payment.service.ts
class PaymentService {
  async processPayment(userId: number, serviceType: string, details: string) {
    // Lógica de pago encapsulada
  }

  async calculateAmount(serviceType: string, userType: string) {
    // Cálculo de monto
  }
}

// En controller
const paymentService = new PaymentService();
const result = await paymentService.processPayment(user.id, service_type, details);
```

### 3. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Too many login attempts'
});
```

### 4. Auditoría Detallada

```typescript
// Tabla de auditoría
CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// En controller
await logAudit(userId, 'payment', {
  service_type,
  amount,
  balance_before,
  balance_after
});
```

---

**Documento versión**: 1.0.0
**Última actualización**: 2025-01-18
