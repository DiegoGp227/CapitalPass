# Configuración Manual de MySQL

## Opción 1: Desde el contenedor (Recomendado)

### 1. Acceder al contenedor MySQL
```bash
docker exec -it capitalpass_mysql bash
```

### 2. Conectar a MySQL
```bash
mysql -u root -p
# Ingresa el password del MYSQL_ROOT_PASSWORD de tu .env
```

### 3. Seleccionar la base de datos
```sql
USE capitalpass;
```

### 4. Copiar y pegar el contenido del archivo db.sql

O desde fuera del contenedor, puedes ejecutar:
```bash
docker exec -i capitalpass_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} capitalpass < back/db/db.sql
```

## Opción 2: Desde tu máquina (si tienes cliente MySQL)

```bash
mysql -h localhost -P 3306 -u capitalpass_user -p capitalpass < back/db/db.sql
# Ingresa el password del MYSQL_PASSWORD de tu .env
```

## Opción 3: Copiar archivo al contenedor y ejecutar

```bash
# 1. Copiar el archivo SQL al contenedor
docker cp back/db/db.sql capitalpass_mysql:/tmp/db.sql

# 2. Ejecutar el SQL desde el contenedor
docker exec -i capitalpass_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} capitalpass < /tmp/db.sql
```

## Verificar que las tablas se crearon correctamente

```bash
# Acceder a MySQL
docker exec -it capitalpass_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} capitalpass

# Listar tablas
SHOW TABLES;

# Ver estructura de la tabla users
DESCRIBE users;

# Ver las tarifas iniciales
SELECT * FROM rates;
```

## Comandos útiles

### Ver logs del contenedor MySQL
```bash
docker logs capitalpass_mysql
```

### Reiniciar contenedor MySQL
```bash
docker restart capitalpass_mysql
```

### Acceder a MySQL con el usuario de la aplicación
```bash
docker exec -it capitalpass_mysql mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} capitalpass
```

## Solución de problemas

### Si el contenedor no está corriendo
```bash
docker ps -a
docker start capitalpass_mysql
```

### Si necesitas borrar y recrear la base de datos
```bash
# Detener y eliminar volúmenes
docker compose down -v

# Volver a levantar
docker compose up -d

# Esperar a que MySQL esté listo
docker logs -f capitalpass_mysql
```

### Backup de la base de datos
```bash
docker exec capitalpass_mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} capitalpass > backup.sql
```

### Restaurar desde backup
```bash
docker exec -i capitalpass_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} capitalpass < backup.sql
```
