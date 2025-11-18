# API Documentation - CapitalPass Backend

Documentación completa de todos los endpoints de la API REST de CapitalPass.

## Índice

1. [Información General](#información-general)
2. [Autenticación](#autenticación)
3. [Endpoints Públicos](#endpoints-públicos)
4. [Endpoints Protegidos](#endpoints-protegidos)
5. [Códigos de Error](#códigos-de-error)
6. [Ejemplos de Uso](#ejemplos-de-uso)

## Información General

### Base URL
```
http://localhost:4000
```

### Content-Type
Todos los requests y responses utilizan JSON:
```
Content-Type: application/json
```

### Autenticación
Las rutas protegidas requieren un token JWT en el header:
```
Authorization: Bearer {token}
```

### Formato de Respuesta

**Respuesta Exitosa:**
```json
{
  "message": "Success message",
  "data": { ... }
}
```

**Respuesta de Error:**
```json
{
  "message": "Error description"
}
```

## Autenticación

### Registro de Usuario

Crea una nueva cuenta de usuario.

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "full_name": "string (requerido)",
  "email": "string (requerido, formato email)",
  "password": "string (requerido, mínimo 6 caracteres)",
  "user_type": "string (requerido)"
}
```

**Tipos de Usuario Válidos:**
- `normal` - Usuario regular sin descuentos
- `subsidiado` - Usuario con descuentos en servicios
- `operador` - Usuario administrativo
- `bicicleta` - Proveedor de servicio de bicicletas
- `parqueadero` - Proveedor de servicio de parqueaderos

**Respuesta Exitosa (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1000,
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "card_number": "10001000",
    "balance": "0.00",
    "is_active": true,
    "created_at": "2025-01-18T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores Posibles:**
- `400` - Missing required fields
- `400` - Invalid email format
- `400` - Password must be at least 6 characters
- `400` - Invalid user type
- `400` - Email already exists
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "123456",
    "user_type": "normal"
  }'
```

---

### Login

Autentica un usuario existente.

**Endpoint:** `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "string (requerido)",
  "password": "string (requerido)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1000,
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "card_number": "10001000",
    "balance": "50000.00",
    "is_active": true,
    "created_at": "2025-01-18T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores Posibles:**
- `400` - Email and password are required
- `401` - Invalid credentials
- `401` - Account is not active
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "123456"
  }'
```

---

## Endpoints Públicos

### Obtener Tarifas de Servicios

Retorna todas las tarifas disponibles con descuentos para usuarios subsidiados.

**Endpoint:** `GET /api/rates`

**Headers:**
```
Ninguno requerido
```

**Respuesta Exitosa (200):**
```json
{
  "rates": [
    {
      "id": 1,
      "service_name": "transmilenio",
      "base_rate": "3000.00",
      "subsidized_discount": "0.25",
      "updated_at": "2025-01-18T08:00:00.000Z"
    },
    {
      "id": 2,
      "service_name": "bicicleta",
      "base_rate": "5000.00",
      "subsidized_discount": "0.20",
      "updated_at": "2025-01-18T08:00:00.000Z"
    },
    {
      "id": 3,
      "service_name": "parqueadero",
      "base_rate": "4000.00",
      "subsidized_discount": "0.15",
      "updated_at": "2025-01-18T08:00:00.000Z"
    }
  ]
}
```

**Cálculo de Tarifa con Descuento:**
```
Tarifa final = base_rate - (base_rate × subsidized_discount)

Ejemplo para transmilenio (usuario subsidiado):
  base_rate = 3000
  subsidized_discount = 0.25 (25%)
  tarifa_final = 3000 - (3000 × 0.25) = 2250
```

**Errores Posibles:**
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl http://localhost:4000/api/rates
```

---

### Recarga por Número de Tarjeta (Público)

Permite recargar saldo a una tarjeta sin autenticación.

**Endpoint:** `POST /api/public/recharge`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "card_number": "string (requerido)",
  "amount": "number (requerido, mayor a 0)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Balance recharged successfully",
  "new_balance": "100000.00"
}
```

**Errores Posibles:**
- `400` - Card number and amount are required
- `400` - Amount must be greater than 0
- `404` - Card not found
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/public/recharge \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "10001000",
    "amount": 50000
  }'
```

---

### Pago por Número de Tarjeta (Público)

Permite realizar un pago usando el número de tarjeta sin autenticación.

**Endpoint:** `POST /api/public/pay`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "card_number": "string (requerido)",
  "service_type": "string (requerido)",
  "service_details": "string (opcional)"
}
```

**Tipos de Servicio Válidos:**
- `transmilenio`
- `bicicleta`
- `parqueadero`

**Respuesta Exitosa (200):**
```json
{
  "message": "Payment successful",
  "transaction": {
    "id": 123,
    "amount": "3000.00",
    "discount_applied": "0.00",
    "balance_before": "50000.00",
    "balance_after": "47000.00",
    "service_type": "transmilenio",
    "service_details": "Estación Portal Norte",
    "created_at": "2025-01-18T14:30:00.000Z"
  }
}
```

**Errores Posibles:**
- `400` - Card number and service type are required
- `400` - Invalid service type
- `400` - Insufficient balance
- `404` - Card not found
- `404` - Service rate not found
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/public/pay \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "10001000",
    "service_type": "transmilenio",
    "service_details": "Estación Portal Norte"
  }'
```

---

## Endpoints Protegidos

Todos los endpoints protegidos requieren autenticación con JWT.

### Header de Autenticación

Todas las rutas protegidas requieren:
```
Authorization: Bearer {token}
```

Donde `{token}` es el JWT obtenido en login o registro.

---

### Obtener Perfil de Usuario

Retorna los datos del usuario autenticado.

**Endpoint:** `GET /api/users/profile`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1000,
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "user_type": "normal",
  "card_number": "10001000",
  "balance": "50000.00",
  "is_active": true,
  "created_at": "2025-01-18T10:30:00.000Z",
  "updated_at": "2025-01-18T10:30:00.000Z"
}
```

**Errores Posibles:**
- `401` - No token provided
- `401` - Invalid token
- `404` - User not found
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Actualizar Perfil de Usuario

Actualiza los datos del usuario autenticado.

**Endpoint:** `PUT /api/users/profile`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "full_name": "string (opcional)",
  "email": "string (opcional, formato email)"
}
```

**Nota:** Al menos un campo debe estar presente.

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1000,
    "full_name": "Juan Carlos Pérez",
    "email": "juancarlos@example.com",
    "user_type": "normal",
    "card_number": "10001000",
    "balance": "50000.00",
    "is_active": true,
    "created_at": "2025-01-18T10:30:00.000Z",
    "updated_at": "2025-01-18T15:45:00.000Z"
  }
}
```

**Errores Posibles:**
- `400` - At least one field (full_name or email) is required
- `400` - Email already exists
- `401` - No token provided
- `401` - Invalid token
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X PUT http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Juan Carlos Pérez",
    "email": "juancarlos@example.com"
  }'
```

---

### Obtener Saldo

Retorna el saldo actual del usuario autenticado.

**Endpoint:** `GET /api/balance`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "balance": "50000.00"
}
```

**Errores Posibles:**
- `401` - No token provided
- `401` - Invalid token
- `404` - User not found
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl http://localhost:4000/api/balance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Recargar Saldo (Autenticado)

Recarga saldo en la cuenta del usuario autenticado.

**Endpoint:** `POST /api/balance/recharge`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "amount": "number (requerido, mayor a 0)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Balance recharged successfully",
  "new_balance": "100000.00"
}
```

**Errores Posibles:**
- `400` - Amount is required
- `400` - Amount must be greater than 0
- `401` - No token provided
- `401` - Invalid token
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/balance/recharge \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000
  }'
```

---

### Realizar Pago (Autenticado)

Procesa un pago de servicio para el usuario autenticado.

**Endpoint:** `POST /api/transactions/pay`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "service_type": "string (requerido)",
  "service_details": "string (opcional)"
}
```

**Tipos de Servicio Válidos:**
- `transmilenio` - Tarifa base: $3,000 (25% desc. subsidiado)
- `bicicleta` - Tarifa base: $5,000 (20% desc. subsidiado)
- `parqueadero` - Tarifa base: $4,000 (15% desc. subsidiado)

**Respuesta Exitosa (200):**
```json
{
  "message": "Payment successful",
  "transaction": {
    "id": 123,
    "amount": "2250.00",
    "discount_applied": "750.00",
    "balance_before": "50000.00",
    "balance_after": "47750.00",
    "service_type": "transmilenio",
    "service_details": "Estación Calle 26",
    "created_at": "2025-01-18T14:30:00.000Z"
  }
}
```

**Cálculo de Descuento:**
- Usuario `normal`: Sin descuento
- Usuario `subsidiado`: Descuento según servicio
  - TransMilenio: 25% → $3,000 → $2,250
  - Bicicleta: 20% → $5,000 → $4,000
  - Parqueadero: 15% → $4,000 → $3,400

**Errores Posibles:**
- `400` - Service type is required
- `400` - Invalid service type
- `400` - Insufficient balance
- `401` - No token provided
- `401` - Invalid token
- `404` - Service rate not found
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:4000/api/transactions/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "transmilenio",
    "service_details": "Estación Calle 26"
  }'
```

---

### Obtener Historial de Transacciones

Retorna todas las transacciones del usuario autenticado.

**Endpoint:** `GET /api/transactions`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "transactions": [
    {
      "id": 123,
      "transaction_type": "recarga",
      "amount": "50000.00",
      "balance_before": "0.00",
      "balance_after": "50000.00",
      "service_details": null,
      "created_at": "2025-01-18T10:00:00.000Z"
    },
    {
      "id": 124,
      "transaction_type": "pago_transmilenio",
      "amount": "2250.00",
      "balance_before": "50000.00",
      "balance_after": "47750.00",
      "service_details": "Estación Calle 26",
      "created_at": "2025-01-18T14:30:00.000Z"
    },
    {
      "id": 125,
      "transaction_type": "pago_bicicleta",
      "amount": "4000.00",
      "balance_before": "47750.00",
      "balance_after": "43750.00",
      "service_details": "Estación Portal Norte",
      "created_at": "2025-01-18T16:15:00.000Z"
    }
  ]
}
```

**Tipos de Transacción:**
- `recarga` - Recarga de saldo
- `pago_transmilenio` - Pago de TransMilenio
- `pago_bicicleta` - Pago de bicicleta
- `pago_parqueadero` - Pago de parqueadero

**Nota:** Las transacciones están ordenadas por fecha de creación (más reciente primero).

**Errores Posibles:**
- `401` - No token provided
- `401` - Invalid token
- `500` - Internal server error

**Ejemplo cURL:**
```bash
curl http://localhost:4000/api/transactions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Health Check

Verifica que el servidor esté funcionando.

**Endpoint:** `GET /ping`

**Headers:**
```
Ninguno requerido
```

**Respuesta Exitosa (200):**
```
"pong"
```

**Ejemplo cURL:**
```bash
curl http://localhost:4000/ping
```

---

## Códigos de Error

### Códigos HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Error de validación o datos incorrectos |
| 401 | Unauthorized | No autenticado o token inválido |
| 404 | Not Found | Recurso no encontrado |
| 500 | Internal Server Error | Error interno del servidor |

### Mensajes de Error Comunes

**Autenticación:**
```json
{ "message": "No token provided" }
{ "message": "Invalid token" }
```

**Validación:**
```json
{ "message": "Email and password are required" }
{ "message": "Invalid email format" }
{ "message": "Password must be at least 6 characters" }
{ "message": "Amount must be greater than 0" }
```

**Recursos:**
```json
{ "message": "User not found" }
{ "message": "Card not found" }
{ "message": "Service rate not found" }
```

**Lógica de Negocio:**
```json
{ "message": "Insufficient balance" }
{ "message": "Email already exists" }
{ "message": "Invalid credentials" }
{ "message": "Account is not active" }
```

---

## Ejemplos de Uso

### Flujo Completo: Registro → Login → Recarga → Pago

#### 1. Registro
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "María García",
    "email": "maria@example.com",
    "password": "password123",
    "user_type": "subsidiado"
  }'
```

**Respuesta:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1001,
    "card_number": "10011001",
    "balance": "0.00"
  },
  "token": "eyJhbGc..."
}
```

#### 2. Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { "balance": "0.00" }
}
```

#### 3. Recargar Saldo
```bash
curl -X POST http://localhost:4000/api/balance/recharge \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000
  }'
```

**Respuesta:**
```json
{
  "message": "Balance recharged successfully",
  "new_balance": "100000.00"
}
```

#### 4. Realizar Pago
```bash
curl -X POST http://localhost:4000/api/transactions/pay \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "transmilenio",
    "service_details": "Estación Calle 26"
  }'
```

**Respuesta (usuario subsidiado con 25% desc.):**
```json
{
  "message": "Payment successful",
  "transaction": {
    "amount": "2250.00",
    "discount_applied": "750.00",
    "balance_after": "97750.00"
  }
}
```

#### 5. Ver Historial
```bash
curl http://localhost:4000/api/transactions \
  -H "Authorization: Bearer eyJhbGc..."
```

**Respuesta:**
```json
{
  "transactions": [
    {
      "transaction_type": "recarga",
      "amount": "100000.00",
      "balance_after": "100000.00"
    },
    {
      "transaction_type": "pago_transmilenio",
      "amount": "2250.00",
      "balance_after": "97750.00"
    }
  ]
}
```

---

### Ejemplo con JavaScript (Fetch API)

```javascript
// 1. Login
const login = async () => {
  const response = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'maria@example.com',
      password: 'password123'
    })
  });

  const data = await response.json();
  return data.token;
};

// 2. Obtener Saldo
const getBalance = async (token) => {
  const response = await fetch('http://localhost:4000/api/balance', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.balance;
};

// 3. Realizar Pago
const makePayment = async (token) => {
  const response = await fetch('http://localhost:4000/api/transactions/pay', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_type: 'transmilenio',
      service_details: 'Estación Portal Norte'
    })
  });

  const data = await response.json();
  return data;
};

// Uso
(async () => {
  const token = await login();
  const balance = await getBalance(token);
  console.log('Saldo:', balance);

  const payment = await makePayment(token);
  console.log('Pago realizado:', payment);
})();
```

---

### Ejemplo con Python (Requests)

```python
import requests

BASE_URL = 'http://localhost:4000'

# 1. Login
def login(email, password):
    response = requests.post(f'{BASE_URL}/api/auth/login', json={
        'email': email,
        'password': password
    })
    return response.json()['token']

# 2. Obtener Perfil
def get_profile(token):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/users/profile', headers=headers)
    return response.json()

# 3. Realizar Pago
def make_payment(token, service_type, details):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.post(f'{BASE_URL}/api/transactions/pay',
        headers=headers,
        json={
            'service_type': service_type,
            'service_details': details
        }
    )
    return response.json()

# Uso
if __name__ == '__main__':
    token = login('maria@example.com', 'password123')
    profile = get_profile(token)
    print(f'Usuario: {profile["full_name"]}')
    print(f'Saldo: ${profile["balance"]}')

    payment = make_payment(token, 'transmilenio', 'Estación Calle 26')
    print(f'Pago: ${payment["transaction"]["amount"]}')
```

---

## Notas Adicionales

### Duración del Token JWT
- Los tokens expiran en **4 horas** por defecto
- Configurable vía variable de entorno `TOKEN_EXPIRATION`
- Después de la expiración, es necesario hacer login nuevamente

### Formato de Números de Tarjeta
- Generados automáticamente al crear usuario
- Formato: `1000{userId}` (ejemplo: `10001000` para user_id=1000)
- Únicos en todo el sistema

### Formato de Montos
- Todos los montos son `DECIMAL(10,2)`
- Representan pesos colombianos (COP)
- Ejemplo: `"50000.00"` = $50,000 COP

### Transacciones ACID
- Todas las operaciones financieras usan transacciones
- Si ocurre un error, los cambios se revierten automáticamente
- Garantiza consistencia en balance y transacciones

### Rate Limiting
**Nota:** Actualmente no implementado. Se recomienda agregar en producción.

---

**Documentación versión**: 1.0.0
**Última actualización**: 2025-01-18
