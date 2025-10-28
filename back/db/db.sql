-- Tabla principal de usuarios
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

-- Tabla de transacciones (historial)
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

-- Tabla de tarifas (para tener centralizado)
CREATE TABLE rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_name VARCHAR(50) NOT NULL,
  base_rate DECIMAL(10, 2) NOT NULL,
  subsidized_discount DECIMAL(3, 2) DEFAULT 0.00, -- 0.25 para 25%, 0.20 para 20%
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar tarifas iniciales
INSERT INTO rates (service_name, base_rate, subsidized_discount) VALUES
('transmilenio', 3000.00, 0.25),
('bicicleta', 5000.00, 0.20),
('parqueadero', 4000.00, 0.15);