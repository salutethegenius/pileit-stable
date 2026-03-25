# PileIt LiveKit → Mux gateway (Node 20). Railway: set service root to this folder and expose PORT.
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway provides PORT; local default in server.js is 8787
EXPOSE 8787

CMD ["node", "src/server.js"]
