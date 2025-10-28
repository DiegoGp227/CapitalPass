# Usa la imagen oficial de Bun
FROM oven/bun:1.0

# Crea el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias y los instala
COPY bun.lock package.json ./
RUN bun install

# Copia el resto del código
COPY . .

# Expone el puerto (ajústalo si usas otro)
EXPOSE 3000

# Comando para iniciar el backend
CMD ["bun", "run", "dev"]
