# Database Documentation - CapitalPass

Documentación completa del esquema de base de datos, modelos y relaciones.

## Índice

1. [Información General](#información-general)
2. [Diagrama de Base de Datos](#diagrama-de-base-de-datos)
3. [Tablas](#tablas)
4. [Relaciones](#relaciones)
5. [Índices](#índices)
6. [Triggers y Constraints](#triggers-y-constraints)
7. [Ejemplos de Queries](#ejemplos-de-queries)
8. [Mantenimiento](#mantenimiento)

## Información General

### Motor de Base de Datos
- **Sistema**: MySQL 8.0+
- **Nombre**: `capitalpass`
- **Charset**: utf8mb4 (por defecto)
- **Collation**: utf8mb4_unicode_ci (recomendado)

### Pool de Conexiones

Configurado en `db/db.ts`:
```typescript
{
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
}
```

**Configuración:**
- Máximo 10 conexiones simultáneas
- Espera si no hay conexiones disponibles
- Sin límite de cola de espera

### Script de Inicialización

El archivo `db/db.sql` contiene:
1. Creación de tablas
2. Definición de constraints
3. Datos iniciales (tarifas)

**Ejecutar inicialización:**
```bash
mysql -u root -p < db/db.sql
```

## Diagrama de Base de Datos

### Diagrama Entidad-Relación (ER)

```
┌─────────────────────────────────────┐
│             USERS                   │
├─────────────────────────────────────┤
│ PK  id (INT)                        │
│ UNQ card_number (VARCHAR)           │
│ UNQ email (VARCHAR)                 │
│     full_name (VARCHAR)             │
│     password_hash (VARCHAR)         │
│     user_type (ENUM)                │
│     balance (DECIMAL)               │
│     is_active (BOOLEAN)             │
│     created_at (TIMESTAMP)          │
│     updated_at (TIMESTAMP)          │
└─────────────────┬───────────────────┘
                  │
                  │ 1:N
                  │
                  ▼
┌─────────────────────────────────────┐
│          TRANSACTIONS               │
├─────────────────────────────────────┤
│ PK  id (INT)                        │
│ FK  user_id (INT) → users.id        │
│     transaction_type (ENUM)         │
│     amount (DECIMAL)                │
│     balance_before (DECIMAL)        │
│     balance_after (DECIMAL)         │
│     service_details (VARCHAR)       │
│     created_at (TIMESTAMP)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             RATES                   │
├─────────────────────────────────────┤
│ PK  id (INT)                        │
│     service_name (VARCHAR)          │
│     base_rate (DECIMAL)             │
│     subsidized_discount (DECIMAL)   │
│     updated_at (TIMESTAMP)          │
└─────────────────────────────────────┘
```

**Relaciones:**
- `users` → `transactions`: 1:N (Un usuario tiene muchas transacciones)
- `rates`: Tabla independiente (catálogo de tarifas)

## Tablas

### Tabla: `users`

Almacena información de usuarios del sistema.

**DDL:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  card_number VARCHAR(20) UNIQUE DEFAULT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('normal', 'subsidiado', 'operador', 'bicicleta', 'parqueadero') NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) AUTO_INCREMENT=1000;
```

**Columnas:**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Identificador único del usuario (PK) |
| `card_number` | VARCHAR(20) | YES | NULL | Número de tarjeta único (generado automáticamente) |
| `full_name` | VARCHAR(100) | NO | - | Nombre completo del usuario |
| `email` | VARCHAR(100) | NO | - | Email único del usuario |
| `password_hash` | VARCHAR(255) | NO | - | Hash bcrypt de la contraseña (60 caracteres típico) |
| `user_type` | ENUM | NO | - | Tipo de usuario (determina descuentos) |
| `balance` | DECIMAL(10,2) | NO | 0.00 | Saldo actual en la billetera (COP) |
| `is_active` | BOOLEAN | NO | true | Estado de la cuenta (activo/inactivo) |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Fecha de creación del usuario |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Última actualización (auto-actualiza) |

**Tipos de Usuario (ENUM):**

| Valor | Descripción | Descuentos |
|-------|-------------|------------|
| `normal` | Usuario regular | Sin descuentos |
| `subsidiado` | Usuario con subsidio | Descuentos según servicio |
| `operador` | Usuario administrativo | (Admin del sistema) |
| `bicicleta` | Proveedor de bicicletas | (Rol de proveedor) |
| `parqueadero` | Proveedor de parqueaderos | (Rol de proveedor) |

**Constraints:**
- `PRIMARY KEY (id)`: Identificador único
- `UNIQUE (email)`: Email único en el sistema
- `UNIQUE (card_number)`: Número de tarjeta único
- `NOT NULL (full_name, email, password_hash, user_type)`: Campos obligatorios
- `CHECK (balance >= 0)`: Saldo no puede ser negativo (implícito en lógica)

**Índices:**
- PRIMARY KEY en `id` (auto-indexado)
- UNIQUE INDEX en `email` (auto-indexado)
- UNIQUE INDEX en `card_number` (auto-indexado)

**Ejemplo de Registro:**
```sql
INSERT INTO users (full_name, email, password_hash, user_type, card_number)
VALUES (
  'Juan Pérez',
  'juan@example.com',
  '$2a$10$XYZ...', -- Hash de bcrypt
  'normal',
  '10001000' -- Generado: 1000 + id
);
```

**Ejemplo de Consulta:**
```sql
SELECT id, full_name, email, user_type, balance, card_number
FROM users
WHERE email = 'juan@example.com' AND is_active = true;
```

---

### Tabla: `transactions`

Almacena el historial completo de transacciones (recargas y pagos).

**DDL:**
```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  transaction_type ENUM('recarga', 'pago_transmilenio', 'pago_bicicleta', 'pago_parqueadero') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  service_details VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columnas:**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Identificador único de la transacción (PK) |
| `user_id` | INT | NO | - | ID del usuario (FK → users.id) |
| `transaction_type` | ENUM | NO | - | Tipo de transacción |
| `amount` | DECIMAL(10,2) | NO | - | Monto de la transacción (COP) |
| `balance_before` | DECIMAL(10,2) | NO | - | Saldo antes de la transacción |
| `balance_after` | DECIMAL(10,2) | NO | - | Saldo después de la transacción |
| `service_details` | VARCHAR(255) | YES | NULL | Detalles adicionales del servicio |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Fecha y hora de la transacción |

**Tipos de Transacción (ENUM):**

| Valor | Descripción | Efecto en Balance |
|-------|-------------|-------------------|
| `recarga` | Recarga de saldo | `balance += amount` |
| `pago_transmilenio` | Pago de TransMilenio | `balance -= amount` |
| `pago_bicicleta` | Pago de bicicleta | `balance -= amount` |
| `pago_parqueadero` | Pago de parqueadero | `balance -= amount` |

**Constraints:**
- `PRIMARY KEY (id)`: Identificador único
- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`:
  - Relación con tabla users
  - Al eliminar usuario, se eliminan sus transacciones
- `NOT NULL (user_id, transaction_type, amount, balance_before, balance_after)`: Campos obligatorios

**Índices:**
- PRIMARY KEY en `id` (auto-indexado)
- FOREIGN KEY INDEX en `user_id` (auto-indexado)

**Recomendaciones de Índices Adicionales:**
```sql
-- Para consultas de historial ordenadas por fecha
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Para consultas de transacciones por usuario y fecha
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
```

**Ejemplo de Registro (Recarga):**
```sql
INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after, service_details)
VALUES (
  1000,
  'recarga',
  50000.00,
  0.00,
  50000.00,
  NULL
);
```

**Ejemplo de Registro (Pago):**
```sql
INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after, service_details)
VALUES (
  1000,
  'pago_transmilenio',
  2250.00,
  50000.00,
  47750.00,
  'Estación Calle 26'
);
```

**Ejemplo de Consulta:**
```sql
SELECT
  id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  service_details,
  created_at
FROM transactions
WHERE user_id = 1000
ORDER BY created_at DESC
LIMIT 20;
```

**Auditoría de Balance:**
```sql
-- Verificar consistencia de balance
SELECT
  user_id,
  COUNT(*) as total_transactions,
  MIN(balance_before) as min_balance,
  MAX(balance_after) as max_balance,
  (SELECT balance FROM users WHERE id = t.user_id) as current_balance
FROM transactions t
GROUP BY user_id;
```

---

### Tabla: `rates`

Catálogo de tarifas de servicios con descuentos para usuarios subsidiados.

**DDL:**
```sql
CREATE TABLE rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_name VARCHAR(50) NOT NULL,
  base_rate DECIMAL(10, 2) NOT NULL,
  subsidized_discount DECIMAL(3, 2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Datos iniciales
INSERT INTO rates (service_name, base_rate, subsidized_discount) VALUES
('transmilenio', 3000.00, 0.25),
('bicicleta', 5000.00, 0.20),
('parqueadero', 4000.00, 0.15);
```

**Columnas:**

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Identificador único de la tarifa (PK) |
| `service_name` | VARCHAR(50) | NO | - | Nombre del servicio |
| `base_rate` | DECIMAL(10,2) | NO | - | Tarifa base del servicio (COP) |
| `subsidized_discount` | DECIMAL(3,2) | NO | 0.00 | Porcentaje de descuento (0.00-1.00) |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Última actualización de tarifa |

**Servicios Disponibles:**

| service_name | base_rate | subsidized_discount | Tarifa Normal | Tarifa Subsidiada |
|--------------|-----------|---------------------|---------------|-------------------|
| `transmilenio` | 3000.00 | 0.25 (25%) | $3,000 | $2,250 |
| `bicicleta` | 5000.00 | 0.20 (20%) | $5,000 | $4,000 |
| `parqueadero` | 4000.00 | 0.15 (15%) | $4,000 | $3,400 |

**Fórmula de Cálculo:**
```
Tarifa Final = base_rate - (base_rate × subsidized_discount)

Ejemplo: TransMilenio para usuario subsidiado
  base_rate = 3000.00
  subsidized_discount = 0.25
  tarifa_final = 3000.00 - (3000.00 × 0.25) = 2250.00
```

**Constraints:**
- `PRIMARY KEY (id)`: Identificador único
- `NOT NULL (service_name, base_rate)`: Campos obligatorios
- `CHECK (subsidized_discount >= 0 AND subsidized_discount <= 1)`: Descuento entre 0% y 100%

**Ejemplo de Consulta:**
```sql
SELECT
  service_name,
  base_rate,
  subsidized_discount,
  (base_rate - (base_rate * subsidized_discount)) as subsidized_rate
FROM rates
WHERE service_name = 'transmilenio';
```

**Actualizar Tarifa:**
```sql
UPDATE rates
SET base_rate = 3500.00
WHERE service_name = 'transmilenio';
-- updated_at se actualiza automáticamente
```

---

## Relaciones

### `users` → `transactions` (1:N)

**Tipo**: One to Many (Un usuario tiene muchas transacciones)

**Foreign Key:**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Comportamiento:**
- **ON DELETE CASCADE**: Al eliminar un usuario, todas sus transacciones se eliminan automáticamente
- **ON UPDATE**: No especificado (por defecto RESTRICT)

**Diagrama:**
```
users (1) ←─────→ (N) transactions
  id      ←─────→     user_id
```

**Ejemplo de Join:**
```sql
SELECT
  u.full_name,
  u.email,
  t.transaction_type,
  t.amount,
  t.created_at
FROM users u
INNER JOIN transactions t ON u.id = t.user_id
WHERE u.id = 1000
ORDER BY t.created_at DESC;
```

**Integridad Referencial:**
```sql
-- No se puede insertar transacción con user_id inexistente
INSERT INTO transactions (user_id, ...) VALUES (99999, ...); -- ERROR

-- Al eliminar usuario, se eliminan sus transacciones
DELETE FROM users WHERE id = 1000; -- Elimina usuario y sus transacciones
```

---

## Índices

### Índices Automáticos

Creados automáticamente por MySQL:

**Tabla `users`:**
- `PRIMARY KEY (id)` → Índice clustered
- `UNIQUE (email)` → Índice único
- `UNIQUE (card_number)` → Índice único

**Tabla `transactions`:**
- `PRIMARY KEY (id)` → Índice clustered
- `FOREIGN KEY (user_id)` → Índice no único

**Tabla `rates`:**
- `PRIMARY KEY (id)` → Índice clustered

### Índices Recomendados (No Implementados)

Para mejorar rendimiento:

```sql
-- Índice para consultas de historial
CREATE INDEX idx_transactions_created_at
ON transactions(created_at DESC);

-- Índice compuesto para consultas por usuario y fecha
CREATE INDEX idx_transactions_user_created
ON transactions(user_id, created_at DESC);

-- Índice para búsqueda de tarifas por nombre
CREATE INDEX idx_rates_service_name
ON rates(service_name);
```

**Beneficios:**
- Consultas de historial más rápidas
- Mejor rendimiento en ORDER BY
- Optimización de paginación

---

## Triggers y Constraints

### Constraints Implementados

**Tabla `users`:**
```sql
-- Constraints implícitos
NOT NULL: full_name, email, password_hash, user_type
UNIQUE: email, card_number
DEFAULT: balance = 0.00, is_active = true
AUTO_INCREMENT: id starts at 1000
```

**Tabla `transactions`:**
```sql
-- Constraints implícitos
NOT NULL: user_id, transaction_type, amount, balance_before, balance_after
FOREIGN KEY: user_id → users(id) ON DELETE CASCADE
```

**Tabla `rates`:**
```sql
-- Constraints implícitos
NOT NULL: service_name, base_rate
DEFAULT: subsidized_discount = 0.00
```

### Constraints Recomendados (No Implementados)

```sql
-- Validar balance no negativo
ALTER TABLE users
ADD CONSTRAINT chk_balance_positive
CHECK (balance >= 0);

-- Validar amounts positivos
ALTER TABLE transactions
ADD CONSTRAINT chk_amount_positive
CHECK (amount > 0);

-- Validar descuentos entre 0 y 1
ALTER TABLE rates
ADD CONSTRAINT chk_discount_range
CHECK (subsidized_discount >= 0 AND subsidized_discount <= 1);

-- Validar consistencia de balance
ALTER TABLE transactions
ADD CONSTRAINT chk_balance_consistency
CHECK (
  (transaction_type = 'recarga' AND balance_after = balance_before + amount) OR
  (transaction_type LIKE 'pago_%' AND balance_after = balance_before - amount)
);
```

### Triggers Potenciales (No Implementados)

```sql
-- Trigger para auditoría de cambios de balance
DELIMITER $$
CREATE TRIGGER trg_balance_audit
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF OLD.balance != NEW.balance THEN
    INSERT INTO balance_audit (user_id, old_balance, new_balance, changed_at)
    VALUES (NEW.id, OLD.balance, NEW.balance, NOW());
  END IF;
END$$
DELIMITER ;

-- Trigger para actualizar updated_at en users
-- (Ya implementado con ON UPDATE CURRENT_TIMESTAMP)
```

---

## Ejemplos de Queries

### Consultas Comunes

#### 1. Buscar Usuario por Email
```sql
SELECT
  id,
  full_name,
  email,
  user_type,
  card_number,
  balance,
  is_active
FROM users
WHERE email = 'juan@example.com'
  AND is_active = true;
```

#### 2. Obtener Saldo de Usuario
```sql
SELECT balance
FROM users
WHERE id = 1000;
```

#### 3. Historial de Transacciones (Últimas 20)
```sql
SELECT
  id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  service_details,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as fecha
FROM transactions
WHERE user_id = 1000
ORDER BY created_at DESC
LIMIT 20;
```

#### 4. Transacciones por Tipo
```sql
SELECT
  transaction_type,
  COUNT(*) as cantidad,
  SUM(amount) as total_monto
FROM transactions
WHERE user_id = 1000
GROUP BY transaction_type
ORDER BY total_monto DESC;
```

#### 5. Obtener Tarifa de Servicio
```sql
SELECT
  service_name,
  base_rate,
  subsidized_discount,
  ROUND(base_rate - (base_rate * subsidized_discount), 2) as subsidized_rate
FROM rates
WHERE service_name = 'transmilenio';
```

### Consultas de Auditoría

#### 1. Verificar Consistencia de Balance
```sql
SELECT
  u.id,
  u.full_name,
  u.balance as current_balance,
  (
    SELECT balance_after
    FROM transactions
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_transaction_balance,
  CASE
    WHEN u.balance = (
      SELECT balance_after
      FROM transactions
      WHERE user_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) THEN 'OK'
    ELSE 'INCONSISTENT'
  END as status
FROM users u
WHERE u.id IN (SELECT DISTINCT user_id FROM transactions);
```

#### 2. Usuarios con Más Transacciones
```sql
SELECT
  u.id,
  u.full_name,
  u.email,
  COUNT(t.id) as total_transacciones,
  SUM(CASE WHEN t.transaction_type = 'recarga' THEN t.amount ELSE 0 END) as total_recargas,
  SUM(CASE WHEN t.transaction_type LIKE 'pago_%' THEN t.amount ELSE 0 END) as total_pagos
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, u.full_name, u.email
ORDER BY total_transacciones DESC
LIMIT 10;
```

#### 3. Transacciones del Día
```sql
SELECT
  transaction_type,
  COUNT(*) as cantidad,
  SUM(amount) as monto_total
FROM transactions
WHERE DATE(created_at) = CURDATE()
GROUP BY transaction_type;
```

#### 4. Usuarios por Tipo
```sql
SELECT
  user_type,
  COUNT(*) as cantidad,
  AVG(balance) as balance_promedio,
  SUM(balance) as balance_total
FROM users
WHERE is_active = true
GROUP BY user_type;
```

### Consultas de Reportes

#### 1. Reporte de Ingresos por Servicio
```sql
SELECT
  t.transaction_type,
  r.service_name,
  COUNT(*) as total_transacciones,
  SUM(t.amount) as ingresos_totales,
  AVG(t.amount) as promedio_transaccion
FROM transactions t
LEFT JOIN rates r ON (
  (t.transaction_type = 'pago_transmilenio' AND r.service_name = 'transmilenio') OR
  (t.transaction_type = 'pago_bicicleta' AND r.service_name = 'bicicleta') OR
  (t.transaction_type = 'pago_parqueadero' AND r.service_name = 'parqueadero')
)
WHERE t.transaction_type LIKE 'pago_%'
  AND DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY t.transaction_type, r.service_name
ORDER BY ingresos_totales DESC;
```

#### 2. Balance Total del Sistema
```sql
SELECT
  COUNT(*) as total_usuarios,
  SUM(balance) as balance_total_sistema,
  AVG(balance) as balance_promedio,
  MIN(balance) as balance_minimo,
  MAX(balance) as balance_maximo
FROM users
WHERE is_active = true;
```

---

## Mantenimiento

### Backup de Base de Datos

**Backup Completo:**
```bash
mysqldump -u capitalpass_user -p capitalpass > backup_capitalpass_$(date +%Y%m%d).sql
```

**Backup Solo Estructura:**
```bash
mysqldump -u capitalpass_user -p --no-data capitalpass > structure_only.sql
```

**Backup Solo Datos:**
```bash
mysqldump -u capitalpass_user -p --no-create-info capitalpass > data_only.sql
```

**Restaurar Backup:**
```bash
mysql -u capitalpass_user -p capitalpass < backup_capitalpass_20250118.sql
```

### Optimización de Tablas

```sql
-- Analizar tablas
ANALYZE TABLE users, transactions, rates;

-- Optimizar tablas
OPTIMIZE TABLE users, transactions, rates;

-- Verificar integridad
CHECK TABLE users, transactions, rates;

-- Reparar si es necesario
REPAIR TABLE users, transactions, rates;
```

### Limpieza de Datos

```sql
-- Eliminar transacciones antiguas (> 1 año)
DELETE FROM transactions
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Archivar transacciones antiguas antes de eliminar
INSERT INTO transactions_archive
SELECT * FROM transactions
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### Monitoreo de Tamaño

```sql
-- Tamaño de tablas
SELECT
  table_name AS 'Tabla',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Tamaño (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'capitalpass'
ORDER BY (data_length + index_length) DESC;

-- Número de registros
SELECT
  'users' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT
  'transactions' as tabla, COUNT(*) as registros FROM transactions
UNION ALL
SELECT
  'rates' as tabla, COUNT(*) as registros FROM rates;
```

### Seguridad

**Crear Usuario de Solo Lectura:**
```sql
CREATE USER 'capitalpass_readonly'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT ON capitalpass.* TO 'capitalpass_readonly'@'localhost';
FLUSH PRIVILEGES;
```

**Revocar Permisos:**
```sql
REVOKE ALL PRIVILEGES ON capitalpass.* FROM 'some_user'@'localhost';
```

---

## Mejoras Recomendadas

### 1. Paginación en Transacciones
```sql
-- Añadir índice para paginación eficiente
CREATE INDEX idx_transactions_pagination
ON transactions(user_id, created_at DESC, id DESC);
```

### 2. Tabla de Auditoría
```sql
CREATE TABLE balance_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  old_balance DECIMAL(10, 2) NOT NULL,
  new_balance DECIMAL(10, 2) NOT NULL,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. Tabla de Sesiones (Refresh Tokens)
```sql
CREATE TABLE user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_token (refresh_token(255))
);
```

### 4. Particionamiento de Transacciones
```sql
-- Para tablas con millones de registros
ALTER TABLE transactions
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

**Documento versión**: 1.0.0
**Última actualización**: 2025-01-18
