# Estágio 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Instala tudo para ter o esbuild disponível no build
RUN npm install 
COPY . .
RUN npm run build

# Estágio 2: Execução
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
# Instala apenas produção agora
RUN npm install --omit=dev
CMD ["node", "dist/server.cjs"]
