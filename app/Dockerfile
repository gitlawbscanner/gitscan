FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Always use /api prefix — server.cjs proxies it to BACKEND_URL at runtime
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.cjs ./server.cjs
# Runtime: where to forward /api/* requests — override in Railway env vars
ENV BACKEND_URL=https://gitscan-production.up.railway.app
CMD ["node", "server.cjs"]
