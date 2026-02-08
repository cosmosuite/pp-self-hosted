# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# .env.production is copied with the source and Vite loads it automatically
RUN npm run build

# Serve stage - lightweight static server
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

# Railway injects PORT at runtime; default to 3000 for local
ENV PORT=3000

CMD ["sh", "-c", "serve -s dist -l $PORT"]
