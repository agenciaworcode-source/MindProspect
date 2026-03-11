# Stage 1: Build Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Servidor (Backend + Statically served Frontend)
FROM node:20-alpine
WORKDIR /app

# Instalação apenas pacotes de produção (Backend)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copiando código do Backend
COPY backend/ ./backend/

# Copiando Build finalizada do Frontend do Stage 1
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Setup Final
WORKDIR /app/backend
EXPOSE 3001

# Entrypoint node.js
CMD ["npm", "start"]
