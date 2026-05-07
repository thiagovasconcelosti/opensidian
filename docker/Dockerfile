FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY scripts/prepare.mjs ./scripts/prepare.mjs

ENV HUSKY=0

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HUSKY=0

RUN addgroup -g 1001 -S nodejs && \
    adduser -S opensidian -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

RUN chown -R opensidian:nodejs /app

USER opensidian

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
