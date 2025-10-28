# Usa Node.js LTS
FROM node:20-alpine

# Crea el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias y los instala
COPY package*.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Expone el puerto
EXPOSE 3000

# Comando para iniciar el frontend
CMD ["npm", "run", "dev"]
