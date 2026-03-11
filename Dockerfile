# Stage 1: Build Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend

# Argumentos de build para o Vite (devem ser passados no Coolify em Build Arguments)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

# Definir como variáveis de ambiente para o processo de build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

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
