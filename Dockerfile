# Stage 1: Build Vite React Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Server Dependencies
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 3: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy server files and production node_modules
COPY server/ ./server
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built frontend client assets
COPY --from=client-builder /app/client/dist ./client/dist

# Copy package.json
COPY package.json ./

EXPOSE 5000
CMD ["node", "server/index.js"]
