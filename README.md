# CapitalPass

Sistema de gestión de tarjetas de transporte público similar a TransMilenio.

## Estructura del Proyecto

```
CapitalPass/
├── back/          # Backend con Bun + Elysia
├── front/         # Frontend con Next.js 15
├── docker-compose.yml
└── .env
```

## Requisitos

- Docker y Docker Compose
- (Opcional) Node.js 20+ para desarrollo local del frontend
- (Opcional) Bun para desarrollo local del backend

## Configuración

1. **Copia el archivo de ejemplo de variables de entorno:**
   ```bash
   cp .env.example .env
   ```

2. **Edita el archivo `.env` con tus credenciales:**
   ```env
   MYSQL_ROOT_PASSWORD=tu_password_root
   MYSQL_DATABASE=capitalpass
   MYSQL_USER=capitalpass_user
   MYSQL_PASSWORD=tu_password_seguro

   PORT=4000
   JWT_SECRET=tu_clave_secreta_jwt_muy_segura
   TOKEN_EXPIRATION=24h
   API_KEY=tu_api_key

   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

## Iniciar el Proyecto

### Con Docker (Recomendado)

```bash
# Construir y levantar todos los servicios
docker compose up --build -d

# Ver logs
docker compose logs -f

# Detener servicios
docker compose down

# Detener y eliminar volúmenes (⚠️ esto borra la base de datos)
docker compose down -v
```

### Servicios Disponibles

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **MySQL**: localhost:3306

## Desarrollo Local

### Backend

```bash
cd back
bun install
bun run dev
```

### Frontend

```bash
cd front
npm install
npm run dev
```

## API Endpoints

### Autenticación

#### Registro
```http
POST /api/signup
Content-Type: application/json

{
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "user_type": "normal"
}
```

**Tipos de usuario válidos:**
- `normal`: Usuario regular
- `subsidiado`: Usuario con subsidio
- `operador`: Operador del sistema
- `bicicleta`: Servicio de bicicletas
- `parqueadero`: Servicio de parqueadero

**Respuesta:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1000,
    "card_number": "1000001000",
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "balance": "0.00"
  }
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "userInfo": {
    "id": 1000,
    "card_number": "1000001000",
    "full_name": "Juan Pérez",
    "email": "juan@example.com",
    "user_type": "normal",
    "balance": "0.00"
  }
}
```

#### Health Check
```http
GET /ping
```

**Respuesta:** `pong`

## Base de Datos

La base de datos se inicializa automáticamente con:
- Tabla `users` con AUTO_INCREMENT desde 1000
- Tabla `transactions` para historial de transacciones
- Tabla `rates` con tarifas iniciales para:
  - TransMilenio: $3,000 (25% descuento subsidiado)
  - Bicicleta: $5,000 (20% descuento subsidiado)
  - Parqueadero: $4,000 (15% descuento subsidiado)

### Números de Tarjeta

Los números de tarjeta se generan automáticamente con el formato:
- `1000` + ID de usuario con 6 dígitos
- Ejemplo: Usuario ID 1000 → Tarjeta `1000001000`
- Ejemplo: Usuario ID 1001 → Tarjeta `1000001001`

## Troubleshooting

### Error: "unable to prepare context: path not found"
- Verifica que las rutas en `docker-compose.yml` sean correctas
- Asegúrate de estar en el directorio raíz del proyecto

### Error: Puerto en uso
```bash
# Linux/Mac
sudo lsof -i :3000
sudo lsof -i :4000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```

### Reiniciar base de datos
```bash
docker compose down -v
docker compose up --build -d
```

## Stack Tecnológico

### Backend
- **Runtime**: Bun
- **Framework**: Elysia
- **Base de datos**: MySQL 8.0
- **Autenticación**: JWT
- **Hashing**: bcryptjs

### Frontend
- **Framework**: Next.js 15 (App Router)
- **React**: 19
- **Styling**: Tailwind CSS 4
- **Animaciones**: Framer Motion
- **Forms**: React Hook Form + Zod
- **State**: Easy Peasy
- **HTTP Client**: Axios + SWR

## Licencia

MIT
