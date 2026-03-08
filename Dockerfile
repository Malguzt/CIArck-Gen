FROM node:20-alpine

WORKDIR /app

# Archivos de configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Iniciar el entorno de desarrollo de Next.js
CMD ["npm", "run", "dev"]
